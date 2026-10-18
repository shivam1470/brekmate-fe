import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { identity, signOut } from "@brekmate/core/auth";
import type { Identity } from "@brekmate/core";
import { createRuntime } from "./runtime";
import { Auth } from "./Auth";
import { Dashboard } from "./Dashboard";
import "./styles.css";
let runtime: ReturnType<typeof createRuntime> | undefined;
let configurationError = "";
try {
  runtime = createRuntime();
} catch (e) {
  configurationError =
    "This workspace is not connected yet. Configure the API origin and staff identity settings before opening team access.";
}
function App() {
  const [user, setUser] = useState<Identity | null>(null),
    [checking, setChecking] = useState(true),
    [error, setError] = useState("");
  const ready = () => {
    void identity()
      .then((u) => {
        if (
          !u.roles.some((r) =>
            ["OWNER", "MANAGER", "OPERATOR", "KITCHEN", "RIDER"].includes(r),
          )
        )
          throw new Error(
            "Your staff account has no workspace role. Contact the owner.",
          );
        setUser(u);
        setError("");
      })
      .catch((e) => setError(e.message))
      .finally(() => setChecking(false));
  };
  useEffect(() => {
    if (runtime) ready();
    else setChecking(false);
  }, []);
  if (configurationError)
    return (
      <main className="setup">
        <h1>BrekMate</h1>
        <h2>Workspace setup required</h2>
        <p>{configurationError}</p>
      </main>
    );
  if (checking)
    return (
      <main className="setup" role="status">
        Opening your workspace…
      </main>
    );
  if (!user)
    return (
      <>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Auth onReady={ready} />
      </>
    );
  return (
    <Dashboard
      key={user.id}
      api={runtime!.api}
      mutations={runtime!.mutations(user.id)}
      user={user}
      onSignOut={() => {
        void signOut().finally(() => {
          setUser(null);
          setError("");
        });
      }}
    />
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
