// Component test harness only. Not referenced by the production web entry.
import { createRoot } from "react-dom/client";
import {
  ApiClient,
  Mutations,
  MutationJournal,
  MemoryVault,
} from "../packages/core/src/index";
import { Dashboard } from "../apps/staff/src/Dashboard";
import "../apps/staff/src/styles.css";
const api = new ApiClient(
  "https://api.brekmate.test",
  async () => "fixture-only-access",
);
const mutations = new Mutations(
  api,
  new MutationJournal(new MemoryVault(), () => crypto.randomUUID()),
);
const rider = new URLSearchParams(location.search).get("role") === "rider";
createRoot(document.getElementById("root")!).render(
  <Dashboard
    api={api}
    mutations={mutations}
    user={{
      id: rider ? "rider-1" : "manager-1",
      roles: rider ? ["RIDER"] : ["MANAGER"],
      email: "fixture@example.test",
    }}
    onSignOut={() => {
      document.body.textContent = "Signed out";
    }}
  />,
);
