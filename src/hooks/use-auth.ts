import { useUser, useAuth as useClerkAuth, useSession } from "@clerk/nextjs";
import { User } from '@/types';
import { updateUserDetails } from "@/app/actions/users";

export function useAuth() {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { signOut, userId, isLoaded: isAuthLoaded } = useClerkAuth();
  const { session } = useSession();

  const loading = !isUserLoaded || !isAuthLoaded;
  const isAuthenticated = !!userId;
  
  const user = clerkUser ? {
    id: clerkUser.id,
    name: clerkUser.fullName,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    image: clerkUser.imageUrl,
    role: (clerkUser.publicMetadata?.role as string) || "attendee",
    onboardingCompleted: !!clerkUser.publicMetadata?.onboardingCompleted,
    points: (clerkUser.publicMetadata?.points as number) || 0,
    level: (clerkUser.publicMetadata?.level as number) || 1,
    xp: (clerkUser.publicMetadata?.xp as number) || 0,
  } as User : null;

  const logout = async () => {
    await signOut({ redirectUrl: "/" });
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user?.id) return null;
    const result = await updateUserDetails(user.id, data);
    // Note: Clerk metadata update should ideally happen via webhook or direct API
    // but for now we rely on our database as the source for extended fields.
    return result.user;
  };

  const checkInUser = async (eventId: string) => {
    if (!user?.id) return;
    await updateUser({ checkedIn: true } as any);
  };

  return {
    user,
    loading,
    isAuthenticated,
    logout,
    updateUser,
    checkInUser,
    authErrorMessage: (error: unknown) => String(error),
  };
}
