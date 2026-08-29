'use server';

import { db } from '@/lib/db';
import { communities, communityMembers, posts, comments, users } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateRole } from '@/lib/auth-utils';
import { z } from 'zod';

import { logActivity } from './feed';
import { awardXP } from '@/lib/gamification/awards';

// --- SCHEMAS ---

const communitySchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  category: z.string(),
  isPrivate: z.boolean().default(false),
  image: z.string().url().optional().or(z.literal('')),
});

const postSchema = z.object({
  content: z.string().min(1).max(2000),
  communityId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

const commentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(1000),
});

// --- ACTIONS ---

/**
 * Create a new community
 */
export async function createCommunity(rawInput: any) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);
  const validated = communitySchema.safeParse(rawInput);
  
  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors };
  }

  try {
    const result = await db.transaction(async (tx) => {
      const newCommunity = await tx.insert(communities).values({
        ...validated.data,
        creatorId: user.id,
      }).returning();

      const communityId = newCommunity[0].id;

      // Creator automatically becomes an admin member
      await tx.insert(communityMembers).values({
        communityId,
        userId: user.id,
        role: 'admin',
      });

      return newCommunity[0];
    });

    // Background tasks
    logActivity({
      userId: user.id,
      type: 'community_joined',
      targetId: result.id,
      content: `Created community: ${result.name}`,
    }).catch(console.error);

    awardXP(user.id, 50, 'Creating a community').catch(console.error);

    revalidatePath('/community');
    return { success: true, community: result };
  } catch (error) {
    console.error('createCommunity Error:', error);
    return { success: false, error: 'Database operation failed' };
  }
}

/**
 * Join a community
 */
export async function joinCommunity(communityId: string) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    const existing = await db
      .select()
      .from(communityMembers)
      .where(and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, user.id)))
      .limit(1);

    if (existing.length > 0) return { success: false, message: 'Already a member' };

    await db.transaction(async (tx) => {
      await tx.insert(communityMembers).values({
        communityId,
        userId: user.id,
      });

      await tx
        .update(communities)
        .set({ memberCount: sql`${communities.memberCount} + 1` })
        .where(eq(communities.id, communityId));
    });

    logActivity({
      userId: user.id,
      type: 'community_joined',
      targetId: communityId,
    }).catch(console.error);

    awardXP(user.id, 10, 'Joining a community').catch(console.error);

    revalidatePath(`/community/${communityId}`);
    return { success: true };
  } catch (error) {
    console.error('joinCommunity Error:', error);
    return { success: false, error: 'Failed to join community' };
  }
}

/**
 * Create a post
 */
export async function createPost(rawInput: any) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);
  const validated = postSchema.safeParse(rawInput);

  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  // Security check: Verify if community is private and user is a member
  if (data.communityId) {
    try {
      const community = await db.query.communities.findFirst({
        where: eq(communities.id, data.communityId),
      });

      if (!community) return { success: false, error: 'Community not found' };

      if (community.isPrivate && user.role !== 'admin') {
        const membership = await db.query.communityMembers.findFirst({
          where: and(
            eq(communityMembers.communityId, data.communityId),
            eq(communityMembers.userId, user.id)
          ),
        });

        if (!membership) {
          return { success: false, error: 'Access denied: You are not a member of this private community' };
        }
      }
    } catch (err) {
      return { success: false, error: 'Failed to verify community status' };
    }
  }

  try {
    const newPost = await db.insert(posts).values({
      content: data.content,
      authorId: user.id,
      communityId: data.communityId,
      imageUrl: data.imageUrl,
    }).returning();

    const postId = newPost[0].id;

    logActivity({
      userId: user.id,
      type: 'post',
      targetId: postId,
      content: data.content.substring(0, 100),
      metadata: {
        communityId: data.communityId,
        imageUrl: data.imageUrl,
      }
    }).catch(console.error);

    awardXP(user.id, 20, 'Posting to the community').catch(console.error);

    revalidatePath(data.communityId ? `/community/${data.communityId}` : '/feed');
    return { success: true, post: newPost[0] };
  } catch (error) {
    console.error('createPost Error:', error);
    return { success: false, error: 'Failed to create post' };
  }
}

/**
 * Like a post
 */
export async function likePost(postId: string) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    await db
      .update(posts)
      .set({ likes: sql`${posts.likes} + 1` })
      .where(eq(posts.id, postId));

    awardXP(user.id, 2, 'Liking a post').catch(console.error);

    revalidatePath('/feed');
    return { success: true };
  } catch (error) {
    console.error('likePost Error:', error);
    return { success: false, error: 'Failed to like post' };
  }
}

/**
 * Create a comment
 */
export async function createComment(rawInput: any) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);
  const validated = commentSchema.safeParse(rawInput);

  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors };
  }

  const { postId, content } = validated.data;

  try {
    const newComment = await db.insert(comments).values({
      postId,
      authorId: user.id,
      content,
    }).returning();

    logActivity({
      userId: user.id,
      type: 'comment',
      targetId: postId,
      content: content.substring(0, 50),
    }).catch(console.error);

    awardXP(user.id, 5, 'Commenting on a post').catch(console.error);

    revalidatePath('/feed');
    return { success: true, comment: newComment[0] };
  } catch (error) {
    console.error('createComment Error:', error);
    return { success: false, error: 'Failed to create comment' };
  }
}

/**
 * Get community posts
 */
export async function getCommunityPosts(communityId: string) {
  const { userId } = await auth();

  try {
    const community = await db.query.communities.findFirst({
      where: eq(communities.id, communityId)
    });

    if (!community) return [];

    if (community.isPrivate) {
      if (!userId) return [];

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      if (!user) return [];

      if (user.role !== 'admin') {
        const membership = await db.query.communityMembers.findFirst({
          where: and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userId, userId)
          )
        });
        if (!membership) return []; // Access denied
      }
    }

    const result = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          image: users.image,
        }
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.communityId, communityId))
      .orderBy(desc(posts.createdAt));
    
    return result;
  } catch (error) {
    console.error('getCommunityPosts Error:', error);
    return [];
  }
}

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string) {
  try {
    const result = await db
      .select({
        comment: comments,
        author: {
          id: users.id,
          name: users.name,
          image: users.image,
        }
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
    
    return result;
  } catch (error) {
    console.error('getPostComments Error:', error);
    return [];
  }
}

export type CommunityListItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  isPrivate: boolean;
  createdAt: Date;
};

export async function getCommunities(search?: string): Promise<CommunityListItem[]> {
  try {
    const whereCondition = search
      ? sql`${communities.name} ILIKE ${`%${search}%`} OR ${communities.description} ILIKE ${`%${search}%`}`
      : undefined;

    const rows = await db
      .select()
      .from(communities)
      .where(whereCondition)
      .orderBy(desc(communities.createdAt));

    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      memberCount: c.memberCount,
      isPrivate: c.isPrivate,
      createdAt: c.createdAt,
    }));
  } catch (error) {
    console.error('getCommunities Error:', error);
    return [];
  }
}

export type CommunityDetail = {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  isPrivate: boolean;
  creatorId: string;
  createdAt: Date;
};

export async function getCommunityById(communityId: string): Promise<CommunityDetail | null> {
  try {
    const community = await db.query.communities.findFirst({
      where: eq(communities.id, communityId),
    });

    if (!community) return null;

    return {
      id: community.id,
      name: community.name,
      description: community.description,
      category: community.category,
      memberCount: community.memberCount,
      isPrivate: community.isPrivate,
      creatorId: community.creatorId,
      createdAt: community.createdAt,
    };
  } catch (error) {
    console.error('getCommunityById Error:', error);
    return null;
  }
}

export type CommunityMemberItem = {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
};

export async function getCommunityMembers(communityId: string): Promise<CommunityMemberItem[]> {
  const { userId } = await auth();

  try {
    const community = await db.query.communities.findFirst({
      where: eq(communities.id, communityId)
    });

    if (!community) return [];

    if (community.isPrivate) {
      if (!userId) return [];

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      if (!user) return [];

      if (user.role !== 'admin') {
        const membership = await db.query.communityMembers.findFirst({
          where: and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userId, userId)
          )
        });
        if (!membership) return []; // Access denied
      }
    }

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        role: communityMembers.role,
      })
      .from(communityMembers)
      .innerJoin(users, eq(communityMembers.userId, users.id))
      .where(eq(communityMembers.communityId, communityId))
      .orderBy(desc(communityMembers.joinedAt));

    return rows;
  } catch (error) {
    console.error('getCommunityMembers Error:', error);
    return [];
  }
}

export async function getMyCommunityMembership(communityId: string): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  try {
    const row = await db.query.communityMembers.findFirst({
      where: and(eq(communityMembers.communityId, communityId), eq(communityMembers.userId, userId)),
    });

    return !!row;
  } catch (error) {
    console.error('getMyCommunityMembership Error:', error);
    return false;
  }
}

export async function updatePost(postId: string, content: string) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    const existing = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!existing) return { success: false, error: 'Post not found' };

    const isOwner = existing.authorId === user.id;
    const isAdmin = (user as any).role === 'admin';
    if (!isOwner && !isAdmin) return { success: false, error: 'Unauthorized' };

    const [updated] = await db
      .update(posts)
      .set({ content: content.trim() })
      .where(eq(posts.id, postId))
      .returning();

    revalidatePath('/feed');
    return { success: true, post: updated };
  } catch (error) {
    console.error('updatePost Error:', error);
    return { success: false, error: 'Failed to update post' };
  }
}

export async function deletePost(postId: string) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    const existing = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (!existing) return { success: false, error: 'Post not found' };

    const isOwner = existing.authorId === user.id;
    const isAdmin = (user as any).role === 'admin';
    if (!isOwner && !isAdmin) return { success: false, error: 'Unauthorized' };

    await db.delete(posts).where(eq(posts.id, postId));
    revalidatePath('/feed');
    return { success: true };
  } catch (error) {
    console.error('deletePost Error:', error);
    return { success: false, error: 'Failed to delete post' };
  }
}

export async function flagPost(postId: string, reason: string) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    await logActivity({
      userId: user.id,
      actorId: user.id,
      type: 'comment',
      targetId: postId,
      content: `FLAGGED:${reason}`,
      metadata: { reason },
    });
    return { success: true };
  } catch (error) {
    console.error('flagPost Error:', error);
    return { success: false, error: 'Failed to flag post' };
  }
}
