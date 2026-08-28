import { insforge } from '../insforge';
import { User, UserRole } from '../../types';

interface AuthUser {
  id: string;
  email: string;
  profile: { name?: string; avatar_url?: string; [key: string]: unknown } | null;
}

async function resolveRole(userId: string): Promise<UserRole> {
  const { data } = await insforge.database.from('profiles').select('role').eq('id', userId).maybeSingle();
  return (data?.role as UserRole | undefined) ?? 'customer';
}

function toUser(authUser: AuthUser, role: UserRole): User {
  return {
    id: authUser.id,
    name: authUser.profile?.name || authUser.email.split('@')[0],
    email: authUser.email,
    role,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data?.user) return null;
  const role = await resolveRole(data.user.id);
  return toUser(data.user, role);
}

export interface SignInResult {
  user: User | null;
  error: string | null;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await insforge.auth.signInWithPassword({ email, password });
  if (error || !data) return { user: null, error: error?.message || 'Could not sign in. Please try again.' };
  const role = await resolveRole(data.user.id);
  return { user: toUser(data.user, role), error: null };
}

export interface SignUpResult {
  user: User | null;
  error: string | null;
  requiresVerification: boolean;
}

export async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await insforge.auth.signUp({ email, password, name });
  if (error || !data) {
    return { user: null, error: error?.message || 'Could not create your account. Please try again.', requiresVerification: false };
  }
  if (data.requireEmailVerification) {
    return { user: null, error: null, requiresVerification: true };
  }
  if (!data.user) {
    return { user: null, error: 'Something went wrong. Please try again.', requiresVerification: false };
  }
  const role = await resolveRole(data.user.id);
  return { user: toUser(data.user, role), error: null, requiresVerification: false };
}

export async function verifySignUpCode(email: string, otp: string): Promise<SignInResult> {
  const { data, error } = await insforge.auth.verifyEmail({ email, otp });
  if (error || !data) return { user: null, error: error?.message || 'Invalid or expired code.' };
  const role = await resolveRole(data.user.id);
  return { user: toUser(data.user, role), error: null };
}

export async function resendSignUpCode(email: string): Promise<void> {
  await insforge.auth.resendVerificationEmail({ email });
}

/** Keeps the public.profiles directory row in sync so admins can see registered accounts. */
export async function syncMyProfile(name: string, email: string, phone?: string | null): Promise<void> {
  try {
    await insforge.database.rpc('sync_my_profile', { p_name: name, p_email: email, p_phone: phone ?? null });
  } catch {
    // Best-effort — a failed directory sync shouldn't block sign-in/sign-up.
  }
}

export async function signInWithGoogle(redirectTo: string): Promise<void> {
  await insforge.auth.signInWithOAuth('google', { redirectTo });
}

export async function signOut(): Promise<void> {
  await insforge.auth.signOut();
}
