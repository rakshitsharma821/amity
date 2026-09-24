/** Build the same-origin PKCE callback URL used by Supabase OAuth and email links. */
export function getAuthCallbackUrl(next = '/dashboard') {
  const callback = new URL('/auth/callback', window.location.origin);
  callback.searchParams.set('next', next);
  return callback.toString();
}
