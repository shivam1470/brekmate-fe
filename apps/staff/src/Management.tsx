import { useState, type FormEvent } from "react";
import {
  type ApiClient,
  type Mutations,
  type Product,
  type Booking,
  formatMoney,
  parseRupees,
} from "@brekmate/core";
import { useQuery, useAction } from "@brekmate/core/react";
export function Catalogue({ api }: { api: ApiClient }) {
  const query = useQuery(() => api.menu(), [api]);
  const [edit, setEdit] = useState<Product | null>(null);
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">MENU & STOCK</span>
          <h1>Fresh, and available.</h1>
          <p className="muted">
            Only available vegetarian items appear in the customer menu.
          </p>
        </div>
        <button
          className="primary"
          onClick={() =>
            setEdit({
              sku: "",
              name: "",
              category: "",
              pricePaise: 0,
              stock: 0,
              available: false,
              vegetarian: true,
              addons: {},
            })
          }
        >
          Add a product
        </button>
      </div>
      {query.error && (
        <p role="alert" className="error">
          {query.error}
        </p>
      )}
      <button onClick={query.reload}>Refresh catalogue</button>
      {query.loading && !query.data && <p role="status">Loading menu…</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Available units</th>
              <th>Status</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((p) => (
              <tr key={p.sku}>
                <td>
                  <strong>{p.name}</strong>
                  <small>{p.sku}</small>
                </td>
                <td>{p.category}</td>
                <td>{formatMoney(p.pricePaise)}</td>
                <td>{p.stock}</td>
                <td>
                  <span
                    className={
                      "badge " + (p.available && p.stock > 0 ? "good" : "")
                    }
                  >
                    {p.available && p.stock > 0
                      ? "Available"
                      : "Hidden / sold out"}
                  </span>
                </td>
                <td>
                  <button onClick={() => setEdit(p)}>Edit {p.name}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <ProductEditor
          key={edit.sku}
          initial={edit}
          api={api}
          close={() => setEdit(null)}
          saved={() => {
            setEdit(null);
            query.reload();
          }}
        />
      )}
    </>
  );
}
function ProductEditor({
  initial,
  api,
  close,
  saved,
}: {
  initial: Product;
  api: ApiClient;
  close: () => void;
  saved: () => void;
}) {
  const [sku, setSku] = useState(initial.sku),
    [name, setName] = useState(initial.name),
    [category, setCategory] = useState(initial.category),
    [price, setPrice] = useState((initial.pricePaise / 100).toFixed(2)),
    [stock, setStock] = useState(String(initial.stock)),
    [available, setAvailable] = useState(initial.available),
    [addons, setAddons] = useState(
      Object.entries(initial.addons)
        .map(([k, v]) => `${k}=${(v / 100).toFixed(2)}`)
        .join("\n"),
    );
  const action = useAction();
  function submit(e: FormEvent) {
    e.preventDefault();
    void action.run(async () => {
      if (!/^\d+$/.test(stock))
        throw new Error("Available units must be a whole number.");
      const parsed: Record<string, number> = {};
      for (const row of addons.split("\n").filter((r) => r.trim())) {
        const [key, value, ...more] = row.split("=");
        if (
          !key ||
          value === undefined ||
          more.length ||
          !/^\w[\w-]{0,63}$/.test(key) ||
          Object.hasOwn(parsed, key)
        )
          throw new Error("Use unique add-on IDs, one ID=rupees per line.");
        parsed[key] = parseRupees(value.trim());
      }
      await api.request("PUT", "/v1/staff/products", {
        expectedVersion: initial.revision ?? 0,
        sku,
        name,
        category,
        pricePaise: parseRupees(price),
        stock: Number(stock),
        available,
        vegetarian: true,
        addons: parsed,
      });
    }, saved);
  }
  return (
    <section className="editor" aria-label="Product editor">
      <form onSubmit={submit}>
        <h2>{initial.sku ? "Edit product" : "New vegetarian product"}</h2>
        <div className="form-grid">
          <label>
            SKU
            <input
              required
              pattern="[A-Za-z0-9_-]{1,64}"
              disabled={!!initial.sku}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </label>
          <label>
            Name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Category
            <input
              required
              value={category}
              maxLength={64}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>
          <label>
            Price in rupees
            <input
              required
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label>
            Available units
            <input
              required
              inputMode="numeric"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          </label>
          <label>
            Add-ons: ID=rupees, one per line
            <textarea
              value={addons}
              onChange={(e) => setAddons(e.target.value)}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          Available to order
        </label>
        <p className="muted">
          Stock is the number of units currently available for new orders.
          Verify it before saving.
        </p>
        {action.error && (
          <p role="alert" className="error">
            {action.error}
          </p>
        )}
        <div className="inline">
          <button className="primary" disabled={action.busy}>
            Save product
          </button>
          <button type="button" disabled={action.busy} onClick={close}>
            Close editor
          </button>
        </div>
      </form>
    </section>
  );
}
export function Celebrations({
  api,
  mutations,
}: {
  api: ApiClient;
  mutations: Mutations;
}) {
  const query = useQuery(() => api.bookings(), [api]);
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">CELEBRATIONS</span>
          <h1>Make room for memories.</h1>
          <p className="muted">
            First floor · up to 20 guests · free venue · no minimum food order
          </p>
        </div>
        <button onClick={query.reload}>Refresh enquiries</button>
      </div>
      <div className="banner">
        <strong>An enquiry is not a reservation.</strong>
        <p>
          Confirm only after checking timings, decoration inclusions and
          assistance with the customer.
        </p>
      </div>
      {query.error && (
        <p role="alert" className="error">
          {query.error}
        </p>
      )}
      {query.loading && !query.data && <p role="status">Loading enquiries…</p>}
      <div className="order-grid">
        {query.data?.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            mutations={mutations}
            reload={query.reload}
          />
        ))}
      </div>
      {query.data?.length === 0 && (
        <div className="empty">No celebration enquiries yet.</div>
      )}
    </>
  );
}
function BookingCard({
  booking: b,
  mutations,
  reload,
}: {
  booking: Booking;
  mutations: Mutations;
  reload: () => void;
}) {
  const action = useAction();
  const [reference, setReference] = useState("");
  const run = (name: string, body = {}) =>
    action.run(
      () =>
        mutations.run(
          `booking-${name}.${b.id}`,
          "POST",
          `/v1/bookings/${b.id}/${name}`,
          body,
        ),
      reload,
    );
  return (
    <article className="order-card">
      <header>
        <h2>
          {b.occasion} · {b.guests} guests
        </h2>
        <span className="status">{b.status}</span>
      </header>
      <p>
        {new Date(b.startsAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}{" "}
        –{" "}
        {new Date(b.endsAt).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
        })}{" "}
        IST
      </p>
      <p>Theme: {b.theme || "To discuss"}</p>
      <p>
        Camera assistance:{" "}
        {b.cameraAssistanceRequested
          ? "Requested; confirm availability"
          : "Not requested"}
      </p>
      <p>
        Photo delivery:{" "}
        {b.photoConsent
          ? `${b.photoChannel} · ${b.photoContact}`
          : "No photo delivery consent"}
      </p>
      <div className="inline">
        {b.status === "enquiry" && (
          <button
            className="primary"
            disabled={action.busy}
            onClick={() => run("confirmation")}
          >
            Confirm time slot
          </button>
        )}
        {["enquiry", "confirmed"].includes(b.status) && (
          <button disabled={action.busy} onClick={() => run("cancellation")}>
            Cancel enquiry / booking
          </button>
        )}
      </div>
      {b.status === "confirmed" &&
        b.photoConsent &&
        b.photoChannel !== "none" &&
        new Date(b.endsAt) < new Date() && (
          <div className="inline-form">
            <label>
              Manual photo delivery reference
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Message / delivery reference"
                maxLength={300}
              />
            </label>
            <button
              disabled={action.busy || !reference.trim()}
              onClick={() => run("photo-delivery", { reference })}
            >
              Record photos shared
            </button>
          </div>
        )}
      {b.photosSharedAt && <p className="success">Photo delivery recorded.</p>}
      {action.error && (
        <p role="alert" className="error">
          {action.error}
        </p>
      )}
    </article>
  );
}
export function Operations({
  api,
  mutations,
  section,
}: {
  api: ApiClient;
  mutations: Mutations;
  section: string;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [riderId, setRiderId] = useState("");
  const [riderName, setRiderName] = useState("");
  const action = useAction();
  const path =
    section === "support"
      ? "SUPPORT"
      : section === "privacy"
        ? "PRIVACY_REQUESTS"
        : `AUDIT#${date}`;
  const query = useQuery(
    () =>
      section === "settings"
        ? Promise.resolve([])
        : api.all<Record<string, unknown>>(
            "/v1/staff/operations/" + encodeURIComponent(path),
          ),
    [api, path, section],
  );
  if (section === "settings")
    return (
      <>
        <div className="page-title">
          <div>
            <span className="eyebrow">OUTLET CONTROLS</span>
            <h1>A café ready for its next break.</h1>
          </div>
        </div>
        <section className="panel">
          <h2>Ordering availability</h2>
          <p>
            Set the outlet open only when the kitchen is ready. Global launch
            settings are managed separately.
          </p>
          <div className="inline">
            <button
              className="primary"
              disabled={action.busy}
              onClick={() =>
                action.run(() =>
                  api.request("PUT", "/v1/staff/outlet", { open: true }),
                )
              }
            >
              Open ordering
            </button>
            <button
              disabled={action.busy}
              onClick={() =>
                action.run(() =>
                  api.request("PUT", "/v1/staff/outlet", { open: false }),
                )
              }
            >
              Close ordering
            </button>
          </div>
          <h2>Rider registry</h2>
          <label>
            Rider display name
            <input
              value={riderName}
              maxLength={100}
              onChange={(e) => setRiderName(e.target.value)}
            />
          </label>
          <p>Use the staff subject ID of an existing Cognito rider account.</p>
          <label>
            Rider ID
            <input
              value={riderId}
              onChange={(e) => setRiderId(e.target.value)}
            />
          </label>
          <div className="inline">
            <button
              disabled={action.busy || !riderId}
              onClick={() =>
                action.run(() =>
                  api.request(
                    "PUT",
                    `/v1/staff/riders/${encodeURIComponent(riderId)}`,
                    { active: true, name: riderName.trim() },
                  ),
                )
              }
            >
              Enable rider
            </button>
            <button
              disabled={action.busy || !riderId}
              onClick={() =>
                action.run(() =>
                  api.request(
                    "PUT",
                    `/v1/staff/riders/${encodeURIComponent(riderId)}`,
                    { active: false },
                  ),
                )
              }
            >
              Disable new dispatches
            </button>
          </div>
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
        </section>
      </>
    );
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">OPERATIONS</span>
          <h1>
            {section === "support"
              ? "Customer support"
              : section === "privacy"
                ? "Privacy requests"
                : "Audit trail"}
          </h1>
          <p className="muted">
            {section === "support"
              ? "Read incoming requests. Responses are currently handled by the café."
              : section === "privacy"
                ? "Access is disabled immediately; erasure requests need retention review."
                : "Recorded actions for the selected UTC date."}
          </p>
        </div>
        <button onClick={query.reload}>Refresh</button>
      </div>
      {section === "audit" && (
        <label>
          UTC date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      )}
      {query.error && (
        <p role="alert" className="error">
          {query.error}
        </p>
      )}
      <div className="order-grid">
        {query.data?.map((row, i) => (
          <article className="panel" key={String(row.id ?? i)}>
            {Object.entries(row).map(([k, v]) => (
              <p key={k}>
                <span className="muted">{k}: </span>
                {String(v)}
              </p>
            ))}
          </article>
        ))}
      </div>
      {query.data?.length === 0 && (
        <div className="empty">No records in this view.</div>
      )}
    </>
  );
}
