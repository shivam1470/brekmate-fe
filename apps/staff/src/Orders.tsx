import { useState, useEffect } from "react";
import { MapPin, Package, Check, Truck, Clock } from "lucide-react";
import {
  type Order,
  type Identity,
  type ApiClient,
  type Mutations,
  formatMoney,
  allowedActions,
  isOperator,
  type Rider,
} from "@brekmate/core";
import { useQuery, useAction } from "@brekmate/core/react";
export function Orders({
  api,
  mutations,
  user,
}: {
  api: ApiClient;
  mutations: Mutations;
  user: Identity;
}) {
  const rider =
    user.roles.includes("RIDER") &&
    !user.roles.some((r) =>
      ["OWNER", "MANAGER", "OPERATOR", "KITCHEN"].includes(r),
    );
  const query = useQuery(() => api.orders(rider), [api, rider]);
  const [filter, setFilter] = useState("active");
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") query.reload();
    }, 15000);
    return () => clearInterval(timer);
  }, [api]);
  const orders = query.data ?? [];
  const shown = orders.filter((o) =>
    filter === "all" || filter === "active"
      ? !["delivered", "rejected", "cancelled"].includes(o.status) ||
        (o.status === "delivered" && o.paymentStatus === "due") ||
        filter === "all"
      : filter === "unpaid"
        ? o.status === "delivered" && o.paymentStatus === "due"
        : o.status === filter,
  );
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">
            {rider ? "DELIVERY DESK" : "CAFÉ OPERATIONS"}
          </span>
          <h1>{rider ? "Your deliveries" : "Orders, in motion."}</h1>
          <p className="muted">
            {rider
              ? "Assigned orders and cash collection."
              : "A good break starts with a well-run kitchen."}
          </p>
        </div>
        <button onClick={query.reload} disabled={query.loading}>
          Refresh orders
        </button>
      </div>
      <div className="stats">
        <Stat
          label="Active orders"
          value={
            orders.filter(
              (o) => !["delivered", "rejected", "cancelled"].includes(o.status),
            ).length
          }
        />
        <Stat
          label="Ready for handoff"
          value={orders.filter((o) => o.status === "ready").length}
        />
        <Stat
          label="Cash awaiting collection"
          value={formatMoney(
            orders
              .filter(
                (o) => o.status === "delivered" && o.paymentStatus === "due",
              )
              .reduce((n, o) => n + o.totalPaise, 0),
          )}
        />
      </div>
      <div className="toolbar">
        <div className="tabs" role="group" aria-label="Order filter">
          {["active", "unpaid", "ready", "delivered", "all"].map((f) => (
            <button
              className={filter === f ? "selected" : ""}
              key={f}
              onClick={() => setFilter(f)}
            >
              {f === "active"
                ? "In progress"
                : f === "unpaid"
                  ? "Cash due"
                  : f.replaceAll("_", " ")}
            </button>
          ))}
        </div>
        <span className="muted small">
          Refreshes every 15 seconds while visible
        </span>
      </div>
      {query.loading && !query.data && <p role="status">Loading orders…</p>}
      {query.error && (
        <p role="alert" className="error">
          {query.error}
        </p>
      )}
      <div className="order-grid">
        {shown.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            api={api}
            mutations={mutations}
            user={user}
            refresh={query.reload}
          />
        ))}
      </div>
      {!query.loading && !query.error && !shown.length && (
        <div className="empty">
          <Package size={38} />
          <h2>All caught up.</h2>
          <p>Orders in this view will appear here.</p>
        </div>
      )}
      <p className="footnote">
        Counters cover the loaded order history, not a daily sales report.
      </p>
    </>
  );
}
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
export function OrderCard({
  order: o,
  api,
  mutations,
  user,
  refresh,
}: {
  order: Order;
  api: ApiClient;
  mutations: Mutations;
  user: Identity;
  refresh: () => void;
}) {
  const [reason, setReason] = useState(""),
    [otp, setOtp] = useState(""),
    [riderId, setRiderId] = useState(""),
    [confirmedCash, setConfirmedCash] = useState(false);
  const action = useAction();
  const [issueReason, setIssueReason] = useState("customer_unreachable"),
    [issueNote, setIssueNote] = useState(""),
    [resetReason, setResetReason] = useState("");
  const actions = allowedActions(o, user.roles, user.id);
  const run = (scope: string, path: string, body: unknown) =>
    action.run(
      () =>
        mutations.run(
          `${scope}.${o.id}`,
          "POST",
          `/v1/orders/${encodeURIComponent(o.id)}/${path}`,
          body,
        ),
      () => {
        setOtp("");
        setConfirmedCash(false);
        refresh();
      },
    );
  const operator = isOperator(user.roles);
  const riders = useQuery(
    () =>
      operator && o.fulfilment === "delivery"
        ? api.all<Rider>("/v1/staff/riders")
        : Promise.resolve([]),
    [api, operator, o.fulfilment],
  );
  const riderAssigned = o.riderId === user.id && user.roles.includes("RIDER");
  return (
    <article className={"order-card " + o.status}>
      <header>
        <div>
          <span className="order-id">#{o.id.slice(0, 8)}</span>
          <span className={"badge " + o.fulfilment}>
            {o.fulfilment === "delivery" ? (
              <Truck size={12} />
            ) : (
              <Package size={12} />
            )}{" "}
            {o.fulfilment}
          </span>
        </div>
        <strong>{formatMoney(o.totalPaise)}</strong>
      </header>
      <p className="muted small">
        <Clock size={12} />{" "}
        {new Date(o.createdAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}{" "}
        IST
      </p>
      <div className="order-lines">
        {o.lines.map((l) => (
          <div key={l.sku}>
            <span>
              <b>{l.quantity} ×</b> {l.name}
              {l.addons?.length > 0 && <small> + {l.addons.join(", ")}</small>}
              {l.instructions && (
                <small className="instructions">{l.instructions}</small>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="order-meta">
        <span className="status">{o.status.replaceAll("_", " ")}</span>
        <span>
          {o.payment} · {o.paymentStatus}
        </span>
      </div>
      {o.address && (
        <p className="address">
          <MapPin size={14} />
          <span>
            {o.address.line}
            <br />
            {o.address.floor} {o.address.landmark}
            <br />
            {o.address.recipientName}{" "}
            {o.address.phone && (
              <a href={`tel:${o.address.phone}`}>{o.address.phone}</a>
            )}
          </span>
          {riderAssigned && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${o.address.latitude},${o.address.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Open map ↗
            </a>
          )}
        </p>
      )}
      {operator &&
        o.fulfilment === "delivery" &&
        !["delivered", "rejected", "cancelled"].includes(o.status) && (
          <div className="inline-form">
            <label>
              Delivery rider
              <select
                aria-label={`Rider for ${o.id}`}
                value={riderId}
                onChange={(e) => setRiderId(e.target.value)}
              >
                <option value="">Choose an active rider</option>
                {riders.data
                  ?.filter((r) => r.active)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
              {riders.error && <p role="alert">{riders.error}</p>}
            </label>
            <button
              disabled={action.busy || !riderId}
              onClick={() => run("assign", "assignment", { riderId })}
            >
              Assign
            </button>
            {o.status === "ready" && (
              <button
                disabled={action.busy}
                onClick={() => run("issue-otp", "otp", {})}
              >
                Issue customer code
              </button>
            )}
          </div>
        )}
      {actions.some((x) => ["rejected", "cancelled"].includes(x)) && (
        <label>
          Reason for rejection/cancellation
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
          />
        </label>
      )}
      {o.fulfilment === "delivery" && actions.includes("delivered") && (
        <label>
          Customer delivery code
          <input
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
          />
        </label>
      )}
      <footer>
        {actions.map((status) => (
          <button
            key={status}
            className={
              ["rejected", "cancelled"].includes(status)
                ? "danger-button"
                : "primary"
            }
            disabled={
              action.busy ||
              (["rejected", "cancelled"].includes(status) && !reason.trim()) ||
              (status === "delivered" &&
                o.fulfilment === "delivery" &&
                otp.length !== 6)
            }
            onClick={() =>
              run(`status-${status}`, "status", {
                status,
                ...(["rejected", "cancelled"].includes(status)
                  ? { reason }
                  : {}),
                ...(status === "delivered" && o.fulfilment === "delivery"
                  ? { otp }
                  : {}),
              })
            }
          >
            {status === "accepted"
              ? "Accept order"
              : status === "preparing"
                ? "Start preparing"
                : status === "ready"
                  ? "Mark ready"
                  : status === "out_for_delivery"
                    ? "Start delivery"
                    : status === "delivered"
                      ? "Complete handoff"
                      : status === "rejected"
                        ? "Reject"
                        : "Cancel"}
          </button>
        ))}
      </footer>
      {o.status === "delivered" && o.paymentStatus === "due" && (
        <p className="error" role="status">
          Handoff complete — cash still needs to be recorded.
        </p>
      )}
      {o.deliveryIssue && (
        <p className="error">
          Delivery issue: {o.deliveryIssue.reason.replaceAll("_", " ")} —{" "}
          {o.deliveryIssue.note}. Arrange the next step with the café.
        </p>
      )}
      {(operator || riderAssigned) &&
        o.fulfilment === "delivery" &&
        ["ready", "out_for_delivery"].includes(o.status) && (
          <details>
            <summary>Report a delivery problem</summary>
            <label>
              Problem
              <select
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
              >
                {[
                  "customer_unreachable",
                  "cash_refused",
                  "address_problem",
                  "other",
                ].map((v) => (
                  <option key={v} value={v}>
                    {v.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Details
              <input
                value={issueNote}
                maxLength={300}
                onChange={(e) => setIssueNote(e.target.value)}
              />
            </label>
            <p className="muted">
              This flags the order for café assistance. It does not mark it
              delivered, restore stock or collect cash.
            </p>
            <button
              disabled={action.busy || !issueNote.trim()}
              onClick={() =>
                run("delivery-issue", "delivery-issues", {
                  reason: issueReason,
                  note: issueNote.trim(),
                })
              }
            >
              Flag for café assistance
            </button>
          </details>
        )}
      {operator &&
        o.fulfilment === "delivery" &&
        o.status === "out_for_delivery" && (
          <details>
            <summary>Renew an expired or locked delivery code</summary>
            <label>
              Reason for renewal
              <input
                value={resetReason}
                maxLength={300}
                onChange={(e) => setResetReason(e.target.value)}
              />
            </label>
            <p className="muted">
              Confirm the delay with the customer. An active valid code cannot
              be replaced. Only the customer can view the code.
            </p>
            <button
              disabled={action.busy || !resetReason.trim()}
              onClick={() =>
                run("issue-otp", "otp", { reason: resetReason.trim() })
              }
            >
              Renew customer code
            </button>
          </details>
        )}
      {o.status === "delivered" &&
        o.paymentStatus === "due" &&
        (operator || riderAssigned) && (
          <div className="cash">
            <label className="check">
              <input
                type="checkbox"
                checked={confirmedCash}
                onChange={(e) => setConfirmedCash(e.target.checked)}
              />
              I have received {formatMoney(o.totalPaise)} in cash.
            </label>
            <button
              className="primary"
              disabled={action.busy || !confirmedCash}
              onClick={() =>
                run("collect", "collection", { amountPaise: o.totalPaise })
              }
            >
              <Check size={14} /> Record cash collection
            </button>
          </div>
        )}
      {action.error && (
        <p role="alert" className="error">
          {action.error}
        </p>
      )}
      {action.notice && (
        <p role="status" className="success">
          {action.notice}
        </p>
      )}
    </article>
  );
}
