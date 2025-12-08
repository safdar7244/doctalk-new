import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  AuthFlowType,
} from "@aws-sdk/client-cognito-identity-provider";

// Cognito configuration from environment variables
const cognitoConfig = {
  region: process.env.NEXT_PUBLIC_AWS_REGION!,
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
};

// Create Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: cognitoConfig.region,
});

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

export interface CognitoUser {
  username: string;
  email: string;
  emailVerified: boolean;
  sub: string;
}

/**
 * Sign up a new user
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ userSub: string; userConfirmed: boolean }> {
  const command = new SignUpCommand({
    ClientId: cognitoConfig.clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
    ],
  });

  const response = await cognitoClient.send(command);

  return {
    userSub: response.UserSub!,
    userConfirmed: response.UserConfirmed ?? false,
  };
}

/**
 * Confirm sign up with verification code
 */
export async function confirmSignUp(
  email: string,
  code: string
): Promise<boolean> {
  const command = new ConfirmSignUpCommand({
    ClientId: cognitoConfig.clientId,
    Username: email,
    ConfirmationCode: code,
  });

  await cognitoClient.send(command);
  return true;
}

/**
 * Resend confirmation code
 */
export async function resendConfirmationCode(email: string): Promise<boolean> {
  const command = new ResendConfirmationCodeCommand({
    ClientId: cognitoConfig.clientId,
    Username: email,
  });

  await cognitoClient.send(command);
  return true;
}

/**
 * Sign in user with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthTokens> {
  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
    ClientId: cognitoConfig.clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const response = await cognitoClient.send(command);

  if (!response.AuthenticationResult) {
    throw new Error("Authentication failed");
  }

  return {
    accessToken: response.AuthenticationResult.AccessToken!,
    idToken: response.AuthenticationResult.IdToken!,
    refreshToken: response.AuthenticationResult.RefreshToken!,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshTokens(
  refreshToken: string
): Promise<Omit<AuthTokens, "refreshToken">> {
  const command = new InitiateAuthCommand({
    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
    ClientId: cognitoConfig.clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  const response = await cognitoClient.send(command);

  if (!response.AuthenticationResult) {
    throw new Error("Token refresh failed");
  }

  return {
    accessToken: response.AuthenticationResult.AccessToken!,
    idToken: response.AuthenticationResult.IdToken!,
  };
}

/**
 * Get current user info from access token
 */
export async function getCurrentUser(
  accessToken: string
): Promise<CognitoUser> {
  const command = new GetUserCommand({
    AccessToken: accessToken,
  });

  const response = await cognitoClient.send(command);

  const attributes = response.UserAttributes || [];
  const getAttribute = (name: string) =>
    attributes.find((attr) => attr.Name === name)?.Value || "";

  return {
    username: response.Username!,
    email: getAttribute("email"),
    emailVerified: getAttribute("email_verified") === "true",
    sub: getAttribute("sub"),
  };
}

/**
 * Sign out user globally (invalidate all tokens)
 */
export async function signOut(accessToken: string): Promise<boolean> {
  const command = new GlobalSignOutCommand({
    AccessToken: accessToken,
  });

  await cognitoClient.send(command);
  return true;
}

/**
 * Initiate forgot password flow
 */
export async function forgotPassword(email: string): Promise<boolean> {
  const command = new ForgotPasswordCommand({
    ClientId: cognitoConfig.clientId,
    Username: email,
  });

  await cognitoClient.send(command);
  return true;
}

/**
 * Confirm forgot password with code and new password
 */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<boolean> {
  const command = new ConfirmForgotPasswordCommand({
    ClientId: cognitoConfig.clientId,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });

  await cognitoClient.send(command);
  return true;
}

/**
 * Parse Cognito error to user-friendly message
 */
export function parseCognitoError(error: unknown): string {
  if (error instanceof Error) {
    const errorName = error.name;

    // Log detailed error for debugging
    console.error("Cognito error:", {
      name: errorName,
      message: error.message,
      stack: error.stack,
    });

    switch (errorName) {
      case "UsernameExistsException":
        return "An account with this email already exists.";
      case "InvalidPasswordException":
        return "Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, numbers, and special characters.";
      case "UserNotFoundException":
        return "No account found with this email.";
      case "NotAuthorizedException":
        return "Incorrect email or password.";
      case "UserNotConfirmedException":
        return "Please verify your email before signing in.";
      case "CodeMismatchException":
        return "Invalid verification code.";
      case "ExpiredCodeException":
        return "Verification code has expired. Please request a new one.";
      case "LimitExceededException":
        return "Too many attempts. Please try again later.";
      case "InvalidParameterException":
        // This often means USER_PASSWORD_AUTH is not enabled
        return `Invalid input: ${error.message}`;
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  return "An unexpected error occurred.";
}
