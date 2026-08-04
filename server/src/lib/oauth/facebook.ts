// Hand-rolled Facebook Login (Graph API) authorization-code flow. Same
// rationale as google.ts — no passport strategy needed for one redirect flow.
import { env } from "../env";
import type { OAuthProfile } from "./types";

const GRAPH_VERSION = "v19.0";
const AUTHORIZATION_ENDPOINT = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const TOKEN_ENDPOINT = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`;
const PROFILE_ENDPOINT = `https://graph.facebook.com/${GRAPH_VERSION}/me`;

export function isFacebookOAuthConfigured(): boolean {
  return Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET && env.FACEBOOK_CALLBACK_URL);
}

export function buildFacebookAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    redirect_uri: env.FACEBOOK_CALLBACK_URL,
    state,
    scope: "email,public_profile",
  });
  return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
}

interface FacebookProfileResponse {
  id: string;
  name?: string;
  email?: string;
}

/**
 * Exchanges an authorization `code` for a normalized OAuthProfile. `email`
 * may be null — Facebook only returns it if the user has a verified email on
 * their account AND grants the `email` permission; callers must handle that
 * (schema requires User.email, so a null email cannot complete signup here).
 */
export async function exchangeFacebookCode(code: string): Promise<OAuthProfile> {
  const tokenUrl = new URL(TOKEN_ENDPOINT);
  tokenUrl.search = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    client_secret: env.FACEBOOK_APP_SECRET,
    redirect_uri: env.FACEBOOK_CALLBACK_URL,
    code,
  }).toString();

  const tokenRes = await fetch(tokenUrl);
  if (!tokenRes.ok) {
    throw new Error("Facebook token exchange failed");
  }
  const tokenBody = (await tokenRes.json()) as FacebookTokenResponse;

  const profileUrl = new URL(PROFILE_ENDPOINT);
  profileUrl.search = new URLSearchParams({
    fields: "id,name,email",
    access_token: tokenBody.access_token,
  }).toString();

  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) {
    throw new Error("Facebook profile request failed");
  }
  const profile = (await profileRes.json()) as FacebookProfileResponse;

  return {
    providerAccountId: profile.id,
    email: profile.email ?? null,
    fullName: profile.name ?? "Facebook User",
  };
}
