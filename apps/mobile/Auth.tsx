import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import {
  signIn,
  confirmSignIn,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
} from "@brekmate/core/auth";
import { useAction } from "@brekmate/core/react";
import { Page, Heading, Field, Button, Feedback, s } from "./ui";
export function Auth({ onReady }: { onReady: () => void }) {
  const [mode, setMode] = useState("signin"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState("");
  const action = useAction();
  function go(next: string) {
    setMode(next);
    setCode("");
    action.clear();
  }
  async function submit() {
    if (mode === "signin") {
      const r = await signIn({
        username: email.trim(),
        password,
        options: { authFlowType: "USER_SRP_AUTH" },
      });
      if (r.isSignedIn) {
        onReady();
        return;
      }
      if (r.nextStep.signInStep === "CONFIRM_SIGN_UP") {
        go("confirm");
        return;
      }
      if (r.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_TOTP_CODE") {
        go("totp");
        return;
      }
      throw new Error(
        "This account needs additional setup. Please contact the café.",
      );
    }
    if (mode === "signup") {
      await signUp({
        username: email.trim(),
        password,
        options: { userAttributes: { email: email.trim() } },
      });
      go("confirm");
      return;
    }
    if (mode === "confirm") {
      await confirmSignUp({ username: email.trim(), confirmationCode: code });
      go("signin");
      return;
    }
    if (mode === "forgot") {
      await resetPassword({ username: email.trim() });
      go("reset");
      return;
    }
    if (mode === "reset") {
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: code,
        newPassword: password,
      });
      go("signin");
      return;
    }
    if (mode === "totp") {
      const r = await confirmSignIn({ challengeResponse: code });
      if (r.isSignedIn) onReady();
      else throw new Error("Additional identity setup is required.");
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page>
        <View style={{ paddingTop: 40, paddingBottom: 24 }}>
          <Text style={[s.title, { fontSize: 50, lineHeight: 60 }]}>
            BrekMate<Text style={{ color: "#FF5C1A" }}>.</Text>
          </Text>
          <Text style={s.eyebrow}>FRESH FOOD. BETTER BREAKS.</Text>
        </View>
        <View style={s.card}>
          <Heading
            eyebrow="YOUR EVERYDAY CAFÉ"
            title={
              mode === "signin"
                ? "A little break, a lot to love."
                : mode === "signup"
                  ? "Make yourself at home."
                  : mode === "forgot"
                    ? "Let’s get you back in."
                    : "One more step."
            }
            description={
              mode === "signin"
                ? "Sign in to browse fresh vegetarian food and plan your next celebration."
                : mode === "signup"
                  ? "Create your account using email."
                  : "Follow the instructions sent to your email or authenticator."
            }
          />
          {!["totp"].includes(mode) && (
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          )}
          {["signin", "signup", "reset"].includes(mode) && (
            <Field
              label={mode === "reset" ? "New password" : "Password"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
          )}
          {["confirm", "reset", "totp"].includes(mode) && (
            <Field
              label={
                mode === "totp"
                  ? "Authenticator code"
                  : "Email verification code"
              }
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
            />
          )}
          {mode === "signup" && (
            <Text style={s.muted}>
              Use at least 12 characters with uppercase, lowercase, a number and
              a symbol.
            </Text>
          )}
          <Feedback error={action.error} notice={action.notice} />
          <Button
            title={
              action.busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Continue"
            }
            disabled={action.busy}
            onPress={() => void action.run(submit)}
          />
          {mode === "signin" ? (
            <>
              <Button
                title="Create an account"
                secondary
                onPress={() => go("signup")}
              />
              <Button
                title="Forgot password?"
                secondary
                onPress={() => go("forgot")}
              />
            </>
          ) : (
            <Button
              title="Back to sign in"
              secondary
              onPress={() => go("signin")}
            />
          )}
          {mode === "confirm" && (
            <Button
              title="Resend verification code"
              secondary
              disabled={action.busy}
              onPress={() =>
                void action.run(() =>
                  resendSignUpCode({ username: email.trim() }),
                )
              }
            />
          )}
        </View>
        <Text style={[s.muted, { textAlign: "center" }]}>
          Pure vegetarian · Made for your everyday break
        </Text>
      </Page>
    </KeyboardAvoidingView>
  );
}
