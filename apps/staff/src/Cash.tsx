import { useState } from "react";
import {
  type ApiClient,
  type CashCollection,
  formatMoney,
  istDate,
  parseRupees,
} from "@brekmate/core";
import { useQuery } from "@brekmate/core/react";
export function Cash({ api }: { api: ApiClient }) {
  const [date, setDate] = useState(istDate()),
    [counted, setCounted] = useState("");
  const q = useQuery(
    () => api.all<CashCollection>("/v1/staff/cash/" + date),
    [api, date],
  );
  const total = q.data?.reduce((sum, r) => sum + r.amountPaise, 0) ?? 0;
  let actual: number | undefined;
  try {
    if (counted) actual = parseRupees(counted);
  } catch {}
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">COD CASH CHECK</span>
          <h1>Every collection accounted for.</h1>
          <p className="muted">
            Collections recorded on this IST day, regardless of when the order
            was placed.
          </p>
        </div>
        <button onClick={q.reload}>Refresh collections</button>
      </div>
      <label>
        Collection date (IST)
        <input
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) {
              setDate(e.target.value);
              setCounted("");
            }
          }}
        />
      </label>
      {q.loading && <p role="status">Loading cash records…</p>}
      {q.error && (
        <p role="alert" className="error">
          {q.error}
        </p>
      )}
      {q.data && !q.error && (
        <>
          <div className="stats">
            <div className="stat">
              <p>Recorded collections</p>
              <strong>{q.data.length}</strong>
            </div>
            <div className="stat">
              <p>Recorded cash</p>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Collector</th>
                  <th>Time (IST)</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((r) => (
                  <tr key={r.orderId}>
                    <td>#{r.orderId.slice(0, 8)}</td>
                    <td>{r.actorId}</td>
                    <td>
                      {new Date(r.collectedAt).toLocaleTimeString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
                    <td>{formatMoney(r.amountPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="panel">
            <h2>Check counted cash</h2>
            <label>
              Cash counted in rupees
              <input
                value={counted}
                inputMode="decimal"
                onChange={(e) => setCounted(e.target.value)}
              />
            </label>
            {actual !== undefined && (
              <p role="status">Difference: {formatMoney(actual - total)}</p>
            )}
            {counted && actual === undefined && (
              <p role="alert">Enter an amount with up to two decimal places.</p>
            )}
            <p className="muted">
              This is a count comparison, not a saved shift closeout or proof of
              rider cash handover. Refresh before comparing. Deposits, refunds
              and settlement need separate audited handling.
            </p>
          </section>
        </>
      )}
    </>
  );
}
