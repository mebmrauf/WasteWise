import { env } from "../env";
import type { OAuthProfile } from "./types";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL);
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
}

interface GoogleUserInfoResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Google token exchange failed");
  }
  const tokenBody = (await tokenRes.json()) as GoogleTokenResponse;

  const userInfoRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokenBody.access_token}` },
  });
  if (!userInfoRes.ok) {
    throw new Error("Google userinfo request failed");
  }
  const profile = (await userInfoRes.json()) as GoogleUserInfoResponse;

  return {
    providerAccountId: profile.sub,
    email: profile.email ?? null,
    fullName: profile.name ?? profile.given_name ?? "Google User",
  };
}
