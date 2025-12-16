import { cookies } from "next/headers";
import { getCurrentUser, refreshTokens, type CognitoUser } from "@/lib/cognito";

const ACCESS_TOKEN_COOKIE = "auth_access_token";
const REFRESH_TOKEN_COOKIE = "auth_refresh_token";
const ID_TOKEN_COOKIE = "auth_id_token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour

export async function getAuthenticatedUser(): Promise<CognitoUser | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return null;
    }

    try {
      return await getCurrentUser(accessToken);
    } catch {
      // Access token might be expired, try refresh
      if (refreshToken) {
        try {
          const newTokens = await refreshTokens(refreshToken);

          // Update cookies with new tokens
          const cookieStore = await cookies();
          cookieStore.set(ACCESS_TOKEN_COOKIE, newTokens.accessToken, {
            ...COOKIE_OPTIONS,
            maxAge: ACCESS_TOKEN_MAX_AGE,
          });
          cookieStore.set(ID_TOKEN_COOKIE, newTokens.idToken, {
            ...COOKIE_OPTIONS,
            maxAge: ACCESS_TOKEN_MAX_AGE,
          });

          return await getCurrentUser(newTokens.accessToken);
        } catch {
          return null;
        }
      }

      return null;
    }
  } catch {
    return null;
  }
}
