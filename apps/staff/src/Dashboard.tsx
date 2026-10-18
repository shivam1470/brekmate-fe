import { useState } from "react";
import {
  ClipboardList,
  UtensilsCrossed,
  CalendarDays,
  Settings,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  ArrowUpRight,
  Truck,
} from "lucide-react";
import {
  type Identity,
  type ApiClient,
  type Mutations,
  isManager,
  isOperator,
} from "@brekmate/core";
import { Orders } from "./Orders";
import { Cash } from "./Cash";
import { Catalogue, Celebrations, Operations } from "./Management";
export function Dashboard({
  api,
  mutations,
  user,
  onSignOut,
}: {
  api: ApiClient;
  mutations: Mutations;
  user: Identity;
  onSignOut: () => void;
}) {
  const [section, setSection] = useState("orders");
  const manager = isManager(user.roles);
  const operator = isOperator(user.roles);
  const riderOnly =
    user.roles.includes("RIDER") &&
    !operator &&
    !user.roles.includes("KITCHEN");
  const nav = [
    {
      id: "orders",
      title: riderOnly ? "Deliveries" : "Orders",
      icon: riderOnly ? Truck : ClipboardList,
    },
    ...(manager
      ? [{ id: "menu", title: "Menu & stock", icon: UtensilsCrossed }]
      : []),
    ...(operator
      ? [{ id: "celebrations", title: "Celebrations", icon: CalendarDays }]
      : []),
    ...(manager
      ? [
          { id: "support", title: "Customer support", icon: LifeBuoy },
          { id: "cash", title: "COD cash check", icon: ClipboardList },
          { id: "privacy", title: "Privacy requests", icon: ShieldCheck },
          { id: "audit", title: "Audit trail", icon: ClipboardList },
          { id: "settings", title: "Outlet settings", icon: Settings },
        ]
      : []),
  ];
  const active = nav.find((n) => n.id === section) ?? nav[0]!;
  return (
    <div className="shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside>
        <div className="brand">
          <div className="brand-icon">B</div>
          <div>
            <strong>BrekMate</strong>
            <small>{riderOnly ? "Rider desk" : "Team workspace"}</small>
          </div>
        </div>
        <div className="nav-label">YOUR CAFÉ</div>
        <nav aria-label="Workspace navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              className={active.id === n.id ? "active" : ""}
              onClick={() => setSection(n.id)}
              aria-current={active.id === n.id ? "page" : undefined}
            >
              <n.icon size={18} />
              {n.title}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="leaf">● Pure vegetarian</span>
          <p>
            Good food.
            <br />
            Great company.
          </p>
          <small>Gurugram</small>
        </div>
        <button className="logout" onClick={onSignOut}>
          <LogOut size={16} />
          Sign out
        </button>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            BrekMate <span className="muted">/ {active.title}</span>
          </span>
          <span className="staff-name">
            <span className="avatar">
              {(user.email ?? "T")[0]?.toUpperCase()}
            </span>
            {user.roles.join(" · ") || "Staff"}
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          {active.id === "orders" ? (
            <Orders api={api} mutations={mutations} user={user} />
          ) : active.id === "menu" ? (
            <Catalogue api={api} />
          ) : active.id === "celebrations" ? (
            <Celebrations api={api} mutations={mutations} />
          ) : active.id === "cash" ? (
            <Cash api={api} />
          ) : (
            <Operations api={api} mutations={mutations} section={active.id} />
          )}
        </main>
        <footer className="workspace-footer">
          <span>BrekMate · Every break, a little better.</span>
          <span>
            Single-outlet pilot <ArrowUpRight size={12} />
          </span>
        </footer>
      </div>
    </div>
  );
}
