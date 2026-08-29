import { pgTable, text, timestamp, integer, boolean, uuid, jsonb, decimal, primaryKey, customType, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom type for pgvector
const vector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(768)';
  },
});

// --- User Management ---

export const users = pgTable('users', {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: text('role').default('attendee').notNull(),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  points: integer('points').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  xp: integer('xp').default(0).notNull(),
  bio: text('bio'),
  skills: text('skills').array(),
  interests: text('interests'),
  college: text('college'),
  degree: text('degree'),
  year: integer('year'),
  company: text('company'),
  designation: text('designation'),
  country: text('country'),
  gender: text('gender'),
  bloodGroup: text('blood_group'),
  organizationName: text('organization_name'),
  website: text('website'),
  phone: text('phone'),
  mobile: text('mobile'),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));
// --- Eventra Core Features ---

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  imageUrl: text('image_url'),
  externalUrl: text('external_url'),
  sourceType: text('source_type').default('native').notNull(),
  sourcePlatform: text('source_platform'),
  externalId: text('external_id'),
  category: text('category').notNull(),
  status: text('status').default('draft').notNull(),
  type: text('type').default('physical').notNull(),
  location: jsonb('location').notNull(), 
  capacity: integer('capacity').notNull(),
  registeredCount: integer('registered_count').default(0).notNull(),
  organizerId: text('organizer_id').references(() => users.id).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).default('0').notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  isRecurring: boolean('is_recurring').default(false).notNull(),
  recurrenceRule: text('recurrence_rule'),
  parentEventId: uuid('parent_event_id'),
  waitlistEnabled: boolean('waitlist_enabled').default(false).notNull(),
  visibility: text('visibility').default('public').notNull(),
  coOrganizerIds: text('co_organizer_ids').array(),
  embedding: vector('embedding'),
  feedbackTemplateId: uuid('feedback_template_id'),
  branding: jsonb('branding'), // { primaryColor, logoUrl, customCss }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  startDateIdx: index('events_start_date_idx').on(table.startDate),
  categoryIdx: index('events_category_idx').on(table.category),
  statusIdx: index('events_status_idx').on(table.status),
  slugIdx: uniqueIndex('events_slug_idx').on(table.slug),
  organizerIdx: index('events_organizer_idx').on(table.organizerId),
  externalIdIdx: index('events_external_id_idx').on(table.externalId),
}));

export const ticketTiers = pgTable('ticket_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  capacity: integer('capacity').notNull(),
  registeredCount: integer('registered_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('ticket_tiers_event_idx').on(table.eventId),
}));

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  tierId: uuid('tier_id').references(() => ticketTiers.id),
  ticketNumber: text('ticket_number').notNull().unique(),
  entryCode: text('entry_code'),
  status: text('status').default('confirmed').notNull(),
  purchaseDate: timestamp('purchase_date').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  qrCode: text('qr_code'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  personalizedMessage: text('personalized_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('tickets_event_idx').on(table.eventId),
  userIdx: index('tickets_user_idx').on(table.userId),
  statusIdx: index('tickets_status_idx').on(table.status),
  entryCodeIdx: index('tickets_entry_code_idx').on(table.entryCode),
  entryCodeEventIdx: index('tickets_entry_code_event_idx').on(table.entryCode, table.eventId),
}));

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  position: integer('position').notNull(),
  status: text('status').default('waiting').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('waitlist_event_idx').on(table.eventId),
  userIdx: index('waitlist_user_idx').on(table.userId),
  statusIdx: index('waitlist_status_idx').on(table.status),
  expiresIdx: index('waitlist_expires_idx').on(table.expiresAt),
}));

// --- Social & Engagement ---

export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  image: text('image'),
  category: text('category').notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  creatorId: text('creator_id').references(() => users.id).notNull(),
  memberCount: integer('member_count').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const communityMembers = pgTable('community_members', {
  communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.communityId, t.userId] }),
  communityIdx: index('community_members_community_idx').on(t.communityId),
  userIdx: index('community_members_user_idx').on(t.userId),
}));

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  authorId: text('author_id').references(() => users.id).notNull(),
  communityId: uuid('community_id').references(() => communities.id, { onDelete: 'cascade' }),
  likes: integer('likes').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  communityIdx: index('posts_community_idx').on(table.communityId),
  authorIdx: index('posts_author_idx').on(table.authorId),
}));

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  authorId: text('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  postIdx: index('comments_post_idx').on(table.postId),
}));

// --- Gamification ---

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  category: text('category').notNull(),
  criteria: jsonb('criteria').notNull(),
});

export const userBadges = pgTable('user_badges', {
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  badgeId: uuid('badge_id').references(() => badges.id, { onDelete: 'cascade' }).notNull(),
  awardedAt: timestamp('awarded_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.badgeId] }),
  userIdx: index('user_badges_user_idx').on(t.userId),
}));

// --- Communications ---

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  link: text('link'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  readIdx: index('notifications_read_idx').on(table.read),
}));

// Note: notifications are modeled as a simple users -> many(notifications) edge in `usersRelations`.
// We intentionally avoid a dedicated `notificationsRelations` block right now because current access
// patterns are user-centric list/read/delete operations and do not require reverse graph traversals.

export const follows = pgTable('follows', {
  followerId: text('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: text('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.followerId, t.followingId] }),
}));

// Note: follows is a self-referential join table against `users`.
// We currently keep this relation explicit at query time (instead of adding symmetrical relation
// helpers) to avoid ambiguous aliasing and to keep typed relation graphs lean for now.

export const chatRooms = pgTable('chat_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  type: text('type').default('direct').notNull(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatParticipants = pgTable('chat_participants', {
  roomId: uuid('room_id').references(() => chatRooms.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roomId, t.userId] }),
  roomIdx: index('chat_participants_room_idx').on(t.roomId),
  userIdx: index('chat_participants_user_idx').on(t.userId),
}));

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').references(() => chatRooms.id, { onDelete: 'cascade' }).notNull(),
  senderId: text('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  roomIdx: index('chat_messages_room_idx').on(table.roomId),
}));

// Chat model scope: room -> participants/messages is enforced via foreign keys and indexes.
// We intentionally do not expose a full bi-directional relations graph for every chat table yet;
// most chat reads are targeted server actions with explicit joins and benefit from this simpler shape.

export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('ai_chat_sessions_user_idx').on(table.userId),
}));

export const aiChatMessages = pgTable('ai_chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => aiChatSessions.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('ai_chat_messages_session_idx').on(table.sessionId),
}));

export const aiRecommendationCache = pgTable('ai_recommendation_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  cacheKey: text('cache_key').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('ai_recommendation_cache_user_idx').on(table.userId),
  cacheKeyIdx: index('ai_recommendation_cache_key_idx').on(table.cacheKey),
  userCacheUnique: uniqueIndex('ai_recommendation_cache_user_key').on(table.userId, table.cacheKey),
}));

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  scope: text('scope').notNull(),
  windowStart: timestamp('window_start').notNull(),
  count: integer('count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  identifierIdx: index('rate_limits_identifier_idx').on(table.identifier),
  scopeIdx: index('rate_limits_scope_idx').on(table.scope),
  windowIdx: index('rate_limits_window_idx').on(table.windowStart),
  identifierScopeWindowUnique: uniqueIndex('rate_limits_identifier_scope_window_idx')
    .on(table.identifier, table.scope, table.windowStart),
}));

export const feedbackTemplates = pgTable('feedback_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  questions: jsonb('questions').notNull(), // Array of { id, type, label, options? }
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const certificateTemplates = pgTable('certificate_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  layout: jsonb('layout').notNull(), // { backgroundUrl, fields: [{ id, type, x, y, size, color, value }] }
  html: text('html'), // Static HTML version for rendering
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const certificateTemplatesRelations = relations(certificateTemplates, ({ one }) => ({
  event: one(events, {
    fields: [certificateTemplates.eventId],
    references: [events.id],
  }),
}));

export const eventFeedback = pgTable('event_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(),
  comment: text('content'),
  npsScore: integer('nps_score'), // 0 to 10 scale
  venueRating: integer('venue_rating'), // 1 to 5
  contentRating: integer('content_rating'), // 1 to 5
  organizationRating: integer('organization_rating'), // 1 to 5
  highlight: text('highlight'),
  improvement: text('improvement'),
  allowTestimonial: boolean('allow_testimonial').default(false).notNull(),
  responses: jsonb('responses'), // Key-value pairs for custom questions
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('event_feedback_event_idx').on(table.eventId),
  feedbackUserEventUnique: uniqueIndex('event_feedback_user_event_idx').on(table.userId, table.eventId),
}));

export const eventStaff = pgTable('event_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(), // 'volunteer', 'speaker', 'admin', 'moderator'
  permissions: jsonb('permissions'), // Array of permission strings if needed
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventUserIdx: index('event_staff_event_user_idx').on(table.eventId, table.userId),
}));

export const sponsors = pgTable('sponsors', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  websiteUrl: text('website_url'),
  tier: text('tier').default('silver').notNull(), // 'bronze', 'silver', 'gold', 'platinum'
  order: integer('order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityFeed = pgTable('activity_feed', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  actorId: text('actor_id').references(() => users.id),
  targetId: text('target_id'),
  content: text('content'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('activity_feed_user_idx').on(table.userId),
}));

export const eventMedia = pgTable('event_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  authorId: text('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  storageId: text('storage_id').notNull(),
  caption: text('caption'),
  isApproved: boolean('is_approved').default(false).notNull(),
  visibility: text('visibility').default('public').notNull(), // 'public', 'private'
  viewCount: integer('view_count').default(0).notNull(),
  downloadCount: integer('download_count').default(0).notNull(),
  metadata: jsonb('metadata'), // { width, height, tags }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('event_media_event_idx').on(table.eventId),
  statusIdx: index('event_media_status_idx').on(table.isApproved),
}));

// --- Relations ---

export const eventMediaRelations = relations(eventMedia, ({ one }) => ({
  event: one(events, {
    fields: [eventMedia.eventId],
    references: [events.id],
  }),
  author: one(users, {
    fields: [eventMedia.authorId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ many, one }) => ({
  ticketTiers: many(ticketTiers),
  tickets: many(tickets),
  waitlist: many(waitlist),
  chatRooms: many(chatRooms),
  aiChatSessions: many(aiChatSessions),
  feedback: many(eventFeedback),
  certificateTemplates: many(certificateTemplates),
  staff: many(eventStaff),
  sponsors: many(sponsors),
  media: many(eventMedia),
  feedbackTemplate: one(feedbackTemplates, {
    fields: [events.feedbackTemplateId],
    references: [feedbackTemplates.id],
  }),
  map: one(eventMaps, {
    fields: [events.id],
    references: [eventMaps.eventId],
  }),
}));

export const sponsorsRelations = relations(sponsors, ({ one }) => ({
  event: one(events, {
    fields: [sponsors.eventId],
    references: [events.id],
  }),
}));

export const eventStaffRelations = relations(eventStaff, ({ one }) => ({
  event: one(events, {
    fields: [eventStaff.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventStaff.userId],
    references: [users.id],
  }),
}));

export const feedbackTemplatesRelations = relations(feedbackTemplates, ({ one, many }) => ({
  event: one(events, {
    fields: [feedbackTemplates.eventId],
    references: [events.id],
  }),
  events: many(events), // Global templates used by many events
}));

export const ticketTiersRelations = relations(ticketTiers, ({ one }) => ({
  event: one(events, {
    fields: [ticketTiers.eventId],
    references: [events.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  tier: one(ticketTiers, {
    fields: [tickets.tierId],
    references: [ticketTiers.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  tickets: many(tickets),
  communities: many(communities),
  communityMembers: many(communityMembers),
  posts: many(posts),
  comments: many(comments),
  notifications: many(notifications),
  userBadges: many(userBadges),
  aiChatSessions: many(aiChatSessions),
  feedback: many(eventFeedback),
  activityLogs: many(activityFeed),
  staff: many(eventStaff),
  // Follow/chat edges are intentionally queried via explicit joins (see notes above).
}));

export const eventFeedbackRelations = relations(eventFeedback, ({ one }) => ({
  event: one(events, {
    fields: [eventFeedback.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventFeedback.userId],
    references: [users.id],
  }),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  creator: one(users, {
    fields: [communities.creatorId],
    references: [users.id],
  }),
  members: many(communityMembers),
  posts: many(posts),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
  user: one(users, {
    fields: [communityMembers.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  community: one(communities, {
    fields: [posts.communityId],
    references: [communities.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));

export const ingestionSources = pgTable('ingestion_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull().unique(),
  category: text('category').notNull(),
  lastScrapedAt: timestamp('last_scraped_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Issue Tracking ---

export const issues = pgTable('issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  eventTitle: text('event_title').notNull(),
  reportedBy: text('reported_by').references(() => users.id).notNull(),
  reporterName: text('reporter_name').notNull(),
  reporterEmail: text('reporter_email').notNull(),
  category: text('category').notNull(),
  subcategory: text('subcategory'),
  severity: text('severity').default('medium').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  attachments: text('attachments').array(),
  status: text('status').default('open').notNull(),
  organizer: text('organizer').references(() => users.id).notNull(),
  organizerEmail: text('organizer_email').notNull(),
  adminNotes: text('admin_notes'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('issues_event_idx').on(table.eventId),
  statusIdx: index('issues_status_idx').on(table.status),
  severityIdx: index('issues_severity_idx').on(table.severity),
  reportedByIdx: index('issues_reported_by_idx').on(table.reportedBy),
}));

// --- Event Updates & Notifications ---

export const eventUpdates = pgTable('event_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').default('general').notNull(),
  status: text('status').default('draft').notNull(),
  publishedAt: timestamp('published_at'),
  createdBy: text('created_by').references(() => users.id).notNull(),
  sendToAll: boolean('send_to_all').default(true).notNull(),
  sendEmail: boolean('send_email').default(true).notNull(),
  emailStats: jsonb('email_stats'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('event_updates_event_idx').on(table.eventId),
  statusIdx: index('event_updates_status_idx').on(table.status),
  createdByIdx: index('event_updates_created_by_idx').on(table.createdBy),
}));

// --- Orders (Payment Transactions) ---

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: text('payment_id').notNull(),
  totalTickets: integer('total_tickets').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  status: text('status').default('completed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('orders_event_idx').on(table.eventId),
  userIdx: index('orders_user_idx').on(table.userId),
  paymentIdIdx: index('orders_payment_id_idx').on(table.paymentId),
}));

// --- Kanban Tasks ---

export const kanbanTasks = pgTable('kanban_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: text('task_id').notNull(),
  content: text('content').notNull(),
  column: text('column').notNull(),
  priority: text('priority').notNull(),
  estimatedDuration: text('estimated_duration').notNull(),
  completed: boolean('completed').default(false).notNull(),
  subtasks: jsonb('subtasks').default([]).notNull(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  organizerId: text('organizer_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('kanban_tasks_event_idx').on(table.eventId),
  organizerIdx: index('kanban_tasks_organizer_idx').on(table.organizerId),
}));

// --- Reports ---

export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  organizerId: text('organizer_id').references(() => users.id).notNull(),
  preparedBy: text('prepared_by'),
  keyHighlights: text('key_highlights').array(),
  majorOutcomes: text('major_outcomes').array(),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  sponsorship: decimal('sponsorship', { precision: 10, scale: 2 }),
  actualExpenditure: decimal('actual_expenditure', { precision: 10, scale: 2 }),
  generatedContent: text('generated_content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('reports_event_idx').on(table.eventId),
  organizerIdx: index('reports_organizer_idx').on(table.organizerId),
}));

// --- Stakeholders ---

export const stakeholders = pgTable('stakeholders', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  attendanceStatus: text('attendance_status').default('registered').notNull(),
  userId: text('user_id').references(() => users.id),
  additionalInfo: jsonb('additional_info'),
  certificateGenerated: boolean('certificate_generated').default(false).notNull(),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  importedBy: text('imported_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('stakeholders_event_idx').on(table.eventId),
  emailIdx: index('stakeholders_email_idx').on(table.email),
  roleIdx: index('stakeholders_role_idx').on(table.role),
  eventEmailUnique: uniqueIndex('stakeholders_event_email_idx').on(table.eventId, table.email),
}));

// --- Feedback Responses ---

export const feedbackResponses = pgTable('feedback_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id),
  isAnonymous: boolean('is_anonymous').default(false).notNull(),
  overallSatisfaction: integer('overall_satisfaction').notNull(),
  contentQuality: integer('content_quality').notNull(),
  organizationRating: integer('organization_rating').notNull(),
  venueRating: integer('venue_rating'),
  recommendationScore: integer('recommendation_score').notNull(),
  likedMost: text('liked_most'),
  improvements: text('improvements'),
  additionalComments: text('additional_comments'),
  customAnswers: jsonb('custom_answers'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('feedback_responses_event_idx').on(table.eventId),
  userIdx: index('feedback_responses_user_idx').on(table.userId),
  eventUserUnique: uniqueIndex('feedback_responses_event_user_idx').on(table.eventId, table.userId),
}));

// --- Tags ---

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  eventCount: integer('event_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('tags_name_idx').on(table.name),
  slugIdx: index('tags_slug_idx').on(table.slug),
}));

export const eventTags = pgTable('event_tags', {
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.eventId, t.tagId] }),
  eventIdx: index('event_tags_event_idx').on(t.eventId),
  tagIdx: index('event_tags_tag_idx').on(t.tagId),
}));

// --- Dynamic Event Maps ---

export const eventMaps = pgTable('event_maps', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: text('image_url').notNull(),
  imageWidth: integer('image_width').notNull(),
  imageHeight: integer('image_height').notNull(),
  edges: jsonb('edges').default([]).notNull(),
  createdBy: text('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventIdx: index('event_maps_event_idx').on(table.eventId),
  eventUnique: uniqueIndex('event_maps_event_unique').on(table.eventId),
}));

export const eventMapNodes = pgTable('event_map_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  mapId: uuid('map_id').references(() => eventMaps.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('location').notNull(),
  x: decimal('x', { precision: 5, scale: 2 }).notNull(),
  y: decimal('y', { precision: 5, scale: 2 }).notNull(),
  icon: text('icon').default('map-pin'),
  color: text('color').default('#6366f1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  mapIdx: index('event_map_nodes_map_idx').on(table.mapId),
}));

export const eventMapsRelations = relations(eventMaps, ({ one, many }) => ({
  event: one(events, {
    fields: [eventMaps.eventId],
    references: [events.id],
  }),
  nodes: many(eventMapNodes),
}));

export const eventMapNodesRelations = relations(eventMapNodes, ({ one }) => ({
  map: one(eventMaps, {
    fields: [eventMapNodes.mapId],
    references: [eventMaps.id],
  }),
}));

// --- Promo Codes & Discounts ---

export const promoCodes = pgTable('promo_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  discountType: text('discount_type').default('percentage').notNull(), // 'percentage' | 'fixed'
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  minOrderAmount: decimal('min_order_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventCodeIdx: index('promo_codes_event_code_idx').on(table.eventId, table.code),
  codeIdx: index('promo_codes_code_idx').on(table.code),
}));

export const promoCodesRelations = relations(promoCodes, ({ one }) => ({
  event: one(events, {
    fields: [promoCodes.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [promoCodes.createdBy],
    references: [users.id],
  }),
}));

// --- 1-on-1 Speed Networking & Meetings ---

export const networkingMeetings = pgTable('networking_meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  requesterId: text('requester_id').references(() => users.id).notNull(),
  recipientId: text('recipient_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').default(15).notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'
  meetingType: text('meeting_type').default('virtual').notNull(), // 'virtual' | 'in_person'
  locationDetails: text('location_details'),
  roomId: text('room_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  requesterIdx: index('meetings_requester_idx').on(table.requesterId),
  recipientIdx: index('meetings_recipient_idx').on(table.recipientId),
  eventIdx: index('meetings_event_idx').on(table.eventId),
  statusIdx: index('meetings_status_idx').on(table.status),
}));

export const networkingMeetingsRelations = relations(networkingMeetings, ({ one }) => ({
  event: one(events, {
    fields: [networkingMeetings.eventId],
    references: [events.id],
  }),
  requester: one(users, {
    fields: [networkingMeetings.requesterId],
    references: [users.id],
    relationName: 'meetingRequester',
  }),
  recipient: one(users, {
    fields: [networkingMeetings.recipientId],
    references: [users.id],
    relationName: 'meetingRecipient',
  }),
}));

// --- Sponsors & Exhibitor Virtual Booth Showcase ---

export const eventSponsors = pgTable('event_sponsors', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  tier: text('tier').default('gold').notNull(), // 'title' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'community'
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  websiteUrl: text('website_url'),
  careersUrl: text('careers_url'),
  description: text('description'),
  demoVideoUrl: text('demo_video_url'),
  promoOffer: text('promo_offer'),
  boothNumber: text('booth_number'),
  leadCount: integer('lead_count').default(0).notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventTierIdx: index('sponsors_event_tier_idx').on(table.eventId, table.tier),
}));

export const sponsorLeads = pgTable('sponsor_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsorId: uuid('sponsor_id').references(() => eventSponsors.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sponsorUserIdx: index('sponsor_leads_sponsor_user_idx').on(table.sponsorId, table.userId),
}));

export const eventSponsorsRelations = relations(eventSponsors, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSponsors.eventId],
    references: [events.id],
  }),
  leads: many(sponsorLeads),
}));

export const sponsorLeadsRelations = relations(sponsorLeads, ({ one }) => ({
  sponsor: one(eventSponsors, {
    fields: [sponsorLeads.sponsorId],
    references: [eventSponsors.id],
  }),
  user: one(users, {
    fields: [sponsorLeads.userId],
    references: [users.id],
  }),
}));

// --- Multi-Track Time Grid Agenda & Session Bookmarks ---

export const agendaSessions = pgTable('agenda_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  track: text('track').default('Main Stage').notNull(), // 'Main Stage', 'AI & ML', 'DevOps', 'Workshop'
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  speakerName: text('speaker_name'),
  speakerTitle: text('speaker_title'),
  speakerAvatar: text('speaker_avatar'),
  roomLocation: text('room_location'),
  sessionType: text('session_type').default('talk').notNull(), // 'keynote' | 'talk' | 'workshop' | 'panel' | 'networking' | 'break'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  eventTrackIdx: index('agenda_event_track_idx').on(table.eventId, table.track),
  eventTimeIdx: index('agenda_event_time_idx').on(table.eventId, table.startTime),
}));

export const agendaBookmarks = pgTable('agenda_bookmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => agendaSessions.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionUserIdx: index('agenda_bookmarks_session_user_idx').on(table.sessionId, table.userId),
}));

export const agendaSessionsRelations = relations(agendaSessions, ({ one, many }) => ({
  event: one(events, {
    fields: [agendaSessions.eventId],
    references: [events.id],
  }),
  bookmarks: many(agendaBookmarks),
}));

export const agendaBookmarksRelations = relations(agendaBookmarks, ({ one }) => ({
  session: one(agendaSessions, {
    fields: [agendaBookmarks.sessionId],
    references: [agendaSessions.id],
  }),
  user: one(users, {
    fields: [agendaBookmarks.userId],
    references: [users.id],
  }),
}));




