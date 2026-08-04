// Shared shape both provider modules normalize their user info responses
// into, so routes/auth.ts can treat Google and Facebook identically.
export interface OAuthProfile {
  providerAccountId: string;
  email: string | null;
  fullName: string;
}
