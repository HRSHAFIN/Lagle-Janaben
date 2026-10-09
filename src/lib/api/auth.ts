import type { User as AuthUser } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { User, UserRole } from '../../types';

async function resolveRole(userId: string): Promise<UserRole> {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return (data?.role as UserRole | undefined) ?? 'customer';
}

function toUser(authUser: AuthUser, role: UserRole): User {
  const email = authUser.email ?? '';
  // `name` is set at email sign-up; Google sign-ins provide `full_name`.
  const meta = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    name: (meta.name as string) || (meta.full_name as string) || email.split('@')[0],
    email,
    role,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  // getSession() waits for supabase-js to finish any OAuth ?code= exchange in the URL.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const role = await resolveRole(data.user.id);
  return toUser(data.user, role);
}

export interface SignInResult {
  user: User | null;
  error: string | null;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { user: null, error: error?.message || 'Could not sign in. Please try again.' };
  const role = await resolveRole(data.user.id);
  return { user: toUser(data.user, role), error: null };
}

export interface SignUpResult {
  user: User | null;
  error: string | null;
  requiresVerification: boolean;
}

export async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) {
    return { user: null, error: error.message || 'Could not create your account. Please try again.', requiresVerification: false };
  }
  // With email confirmation on, Supabase returns a user but no session until the code is verified.
  if (!data.session) {
    return { user: null, error: null, requiresVerification: true };
  }
  if (!data.user) {
    return { user: null, error: 'Something went wrong. Please try again.', requiresVerification: false };
  }
  const role = await resolveRole(data.user.id);
  return { user: toUser(data.user, role), error: null, requiresVerification: false };
}

export async function verifySignUpCode(email: string, otp: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
  if (error || !data.user) return { user: null, error: error?.message || 'Invalid or expired code.' };
  const role = await resolveRole(data.user.id);
  return { user: toUser(data.user, role), error: null };
}

export async function resendSignUpCode(email: string): Promise<void> {
  await supabase.auth.resend({ type: 'signup', email });
}

/** Keeps the public.profiles directory row in sync so admins can see registered accounts. */
export async function syncMyProfile(name: string, email: string, phone?: string | null): Promise<void> {
  try {
    await supabase.rpc('sync_my_profile', { p_name: name, p_email: email, p_phone: phone ?? null });
  } catch {
    // Best-effort — a failed directory sync shouldn't block sign-in/sign-up.
  }
}

export async function signInWithGoogle(redirectTo: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
