"use server";

import { cookies } from "next/headers";
import {
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  resendConfirmationCode as cognitoResendCode,
  forgotPassword as cognitoForgotPassword,
  confirmForgotPassword as cognitoConfirmForgotPassword,
  getCurrentUser,
  refreshTokens,
  parseCognitoError,
  type AuthTokens,
  type CognitoUser,
} from "@/lib/cognito";

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_COOKIE = "auth_access_token";
const REFRESH_TOKEN_COOKIE = "auth_refresh_token";
const ID_TOKEN_COOKIE = "auth_id_token";

// Token expiration times (in seconds)
const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Sign up a new user
 */
export async function signUpAction(
  name: string,
  email: string,
  password: string
): Promise<ActionResult<{ userSub: string; requiresConfirmation: boolean }>> {
  try {
    const result = await cognitoSignUp(email, password, name);

    return {
      success: true,
      data: {
        userSub: result.userSub,
        requiresConfirmation: !result.userConfirmed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Confirm sign up with verification code
 */
export async function confirmSignUpAction(
  email: string,
  code: string
): Promise<ActionResult> {
  try {
    await cognitoConfirmSignUp(email, code);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Confirm sign up and automatically sign in
 */
export async function confirmSignUpAndSignInAction(
  email: string,
  code: string,
  password: string
): Promise<ActionResult<CognitoUser>> {
  try {
    // First confirm the signup
    await cognitoConfirmSignUp(email, code);

    // Then sign in
    const tokens = await cognitoSignIn(email, password);

    // Store tokens in cookies
    await setAuthCookies(tokens);

    // Get user info
    const user = await getCurrentUser(tokens.accessToken);

    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Resend confirmation code
 */
export async function resendConfirmationCodeAction(
  email: string
): Promise<ActionResult> {
  try {
    await cognitoResendCode(email);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Sign in user
 */
export async function signInAction(
  email: string,
  password: string
): Promise<ActionResult<CognitoUser>> {
  try {
    const tokens = await cognitoSignIn(email, password);

    // Store tokens in cookies
    await setAuthCookies(tokens);

    // Get user info
    const user = await getCurrentUser(tokens.accessToken);

    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Sign out user
 */
export async function signOutAction(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

    if (accessToken) {
      try {
        await cognitoSignOut(accessToken);
      } catch {
        // Continue with local sign out even if global sign out fails
      }
    }

    // Clear all auth cookies
    await clearAuthCookies();

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Get current authenticated user
 */
export async function getAuthUserAction(): Promise<ActionResult<CognitoUser | null>> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!accessToken) {
      return { success: true, data: null };
    }

    try {
      const user = await getCurrentUser(accessToken);
      return { success: true, data: user };
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

          const user = await getCurrentUser(newTokens.accessToken);
          return { success: true, data: user };
        } catch {
          // Refresh failed, clear cookies
          await clearAuthCookies();
          return { success: true, data: null };
        }
      }

      return { success: true, data: null };
    }
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Initiate forgot password flow
 */
export async function forgotPasswordAction(
  email: string
): Promise<ActionResult> {
  try {
    await cognitoForgotPassword(email);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

/**
 * Confirm forgot password with code and new password
 */
export async function confirmForgotPasswordAction(
  email: string,
  code: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    await cognitoConfirmForgotPassword(email, code, newPassword);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: parseCognitoError(error),
    };
  }
}

// Helper functions for cookie management
async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  cookieStore.set(ID_TOKEN_COOKIE, tokens.idToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(ID_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
