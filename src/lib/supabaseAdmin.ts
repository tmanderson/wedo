import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client using the service role key
 * This should only be used server-side and bypasses RLS
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase configuration missing. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Sends an invite email via Supabase to a new user
 * This creates the user in Supabase Auth and sends them an invite email
 * @param email - The recipient's email address
 * @param redirectTo - The URL to redirect to after authentication
 */
export async function sendMagicLinkInvite(
  email: string,
  redirectTo: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // inviteUserByEmail creates the user if they don't exist and sends an invite email
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (error) {
    // If user already exists, send them a magic link instead
    if (error.message?.includes("already been registered")) {
      // Use signInWithOtp to send a magic link email to existing users
      // We need to use the anon client for this since admin.generateLink doesn't send emails
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const { error: otpError } = await anonClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        console.error("Failed to send magic link to existing user:", otpError);
        throw new Error(`Failed to send invite: ${otpError.message}`);
      }

      console.log(`Magic link sent to existing user ${email}`);
      return;
    }

    console.error("Failed to invite user:", error);
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
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
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
    console.error("Failed to get user:", error);
    return null;
  }

  return data.user;
}

export default {
  sendMagicLinkInvite,
  ensureUserExists,
  getUserById,
};
