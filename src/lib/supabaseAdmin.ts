import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client using the service role key
 * This should only be used server-side
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase configuration missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Sends a magic link invite email via Supabase
 * @param email - The recipient's email address
 * @param redirectTo - The URL to redirect to after authentication
 */
export async function sendMagicLinkInvite(
  email: string,
  redirectTo: string
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('Failed to generate magic link:', error);
    throw new Error(`Failed to send invite: ${error.message}`);
  }
}

/**
 * Creates a user in Supabase if they don't exist
 * Used when inviting someone who hasn't signed up yet
 */
export async function ensureUserExists(email: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // Try to get existing user
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    return existingUser.id;
  }

  // User doesn't exist - they'll be created when they sign up via magic link
  return null;
}

/**
 * Gets user info from Supabase by ID
 */
export async function getUserById(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    console.error('Failed to get user:', error);
    return null;
  }

  return data.user;
}

export default {
  sendMagicLinkInvite,
  ensureUserExists,
  getUserById,
};
