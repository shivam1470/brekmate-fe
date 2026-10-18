import { useState, type FormEvent } from "react";
import {
  signIn,
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
} from "@brekmate/core/auth";
import { useAction } from "@brekmate/core/react";
export function Auth({ onReady }: { onReady: () => void }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [challenge, setChallenge] = useState("SIGN_IN"),
    [answer, setAnswer] = useState(""),
    [totp, setTotp] = useState("");
  const action = useAction();
  async function next(result: any) {
    if (result.isSignedIn) {
      onReady();
      return;
    }
    const step = result.nextStep.signInStep;
    setChallenge(step);
    if (step === "CONTINUE_SIGN_IN_WITH_TOTP_SETUP")
      setTotp(result.nextStep.totpSetupDetails.sharedSecret);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      if (challenge === "RESET") {
        await resetPassword({ username: email });
        setChallenge("RESET_CODE");
        return;
      }
      if (challenge === "RESET_CODE") {
        await confirmResetPassword({
          username: email,
          confirmationCode: answer,
          newPassword: password,
        });
        setChallenge("SIGN_IN");
        return;
      }
      if (challenge === "SIGN_IN")
        await next(
          await signIn({
            username: email,
            password,
            options: { authFlowType: "USER_SRP_AUTH" },
          }),
        );
      else await next(await confirmSignIn({ challengeResponse: answer }));
    });
  }
  const code = [
    "CONFIRM_SIGN_IN_WITH_TOTP_CODE",
    "CONTINUE_SIGN_IN_WITH_TOTP_SETUP",
  ].includes(challenge);
  const newPassword =
    challenge === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED";
  const supported =
    challenge === "SIGN_IN" ||
    code ||
    newPassword ||
    ["RESET", "RESET_CODE"].includes(challenge);
  return (
    <main className="login">
      <section className="login-brand">
        <span className="eyebrow">FRESH FOOD. BETTER BREAKS.</span>
        <h1>BrekMate</h1>
        <p>
          Your café,
          <br />
          working together.
        </p>
        <div className="login-note">Kitchen · Operations · Rider</div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">TEAM ACCESS</span>
        <h2>
          {challenge === "SIGN_IN"
            ? "Good to have you back."
            : "Complete your sign-in"}
        </h2>
        <p className="muted">Use the account provided by your café manager.</p>
        {(challenge === "SIGN_IN" || challenge === "RESET") && (
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        )}
        {(challenge === "SIGN_IN" || challenge === "RESET_CODE") && (
          <label>
            {challenge === "RESET_CODE" ? "New password" : "Password"}
            <input
              type="password"
              autoComplete={
                challenge === "RESET_CODE" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        )}
        {totp && (
          <p className="secret">
            Add this setup key to your authenticator: <code>{totp}</code>
          </p>
        )}
        {challenge !== "SIGN_IN" && challenge !== "RESET" && supported && (
          <label>
            {newPassword
              ? "Set a new password"
              : code
                ? "Authenticator code"
                : "Email verification code"}
            <input
              type={newPassword ? "password" : "text"}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              autoComplete={newPassword ? "new-password" : "one-time-code"}
              required
            />
          </label>
        )}
        {!supported && (
          <p role="alert">
            This identity needs a setup step not supported here. Contact your
            manager.
          </p>
        )}
        {action.error && (
          <p role="alert" className="error">
            {action.error}
          </p>
        )}
        <button className="primary" disabled={action.busy || !supported}>
          {action.busy ? "Please wait…" : "Continue"}
        </button>
        {challenge === "SIGN_IN" && (
          <button
            type="button"
            className="text-button"
            onClick={() => setChallenge("RESET")}
          >
            Forgot password?
          </button>
        )}
        {challenge !== "SIGN_IN" && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setChallenge("SIGN_IN");
              setTotp("");
              setAnswer("");
            }}
          >
            Back to sign in
          </button>
        )}
      </form>
    </main>
  );
}
