import { Amplify } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import {
  signIn,
  confirmSignIn,
  signOut,
  fetchAuthSession,
  getCurrentUser,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
} from "aws-amplify/auth";
import type { Vault } from "./storage";
export {
  signIn,
  confirmSignIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
};
export function configureIdentity(
  userPoolId: string,
  userPoolClientId: string,
  vault: Vault,
) {
  if (
    !/^[a-z0-9-]+_[a-zA-Z0-9]+$/.test(userPoolId) ||
    !/^[a-zA-Z0-9]+$/.test(userPoolClientId)
  )
    throw new Error("Configure the Cognito pool and public client ID.");
  Amplify.configure({
    Auth: {
      Cognito: { userPoolId, userPoolClientId, loginWith: { email: true } },
    },
  });
  cognitoUserPoolsTokenProvider.setKeyValueStorage(vault);
}
export async function accessToken() {
  return (await fetchAuthSession()).tokens?.accessToken.toString() ?? null;
}
export async function identity() {
  const u = await getCurrentUser();
  const p = (await fetchAuthSession()).tokens?.accessToken.payload;
  const groups = p?.["cognito:groups"];
  return {
    id: u.userId,
    email: u.signInDetails?.loginId,
    roles: Array.isArray(groups)
      ? groups.filter((r): r is string => typeof r === "string")
      : [],
  };
}
