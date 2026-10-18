# COD batch 1: completed development and second review

18 October 2026. Launch scope: cash on delivery and cash at pickup. **Production approval remains blocked.** This package is ready for staging review, not public ordering.

## Implemented

- Signed ten-minute server quotes bind the customer, basket, current item details and totals. New checkout attempts reject expired or changed consent before stock/wallet writes; accepted idempotent retries still return the original order after expiry.
- Query results are tied to input keys, preventing previous basket/order results appearing as the current result while a different key loads.
- Customer-scoped checkout reconciliation returns the accepted order or atomically closes an abandoned attempt. A late original request cannot create an order after abandonment. Original-key comparison protects newer local journal entries from old completions. Storage read failures visibly block ordering.
- Delivery addresses include recipient name/phone, floor/unit and landmark. One-time foreground GPS, native address lookup, external Maps verification, location confirmation and server serviceability checks replace mandatory manual coordinate entry. Manual coordinates remain available after denied permissions, slow GPS or lookup failures. GPS accuracy worse than 200 metres is rejected. No continuous location tracking or paid maps API was added. Phone format is validated; phone ownership is not verified.
- Handed-over cash-due orders stay in the default work queue and a Cash due filter. Staff assign named riders. Assigned riders can call recipients, open Maps and flag unreachable customers, cash refusal or address problems without falsely completing delivery or collection.
- Cash collection writes a date index atomically with order/ledger updates. Staff can inspect collections on the IST collection day and compare counted cash against recorded cash. Retries do not double-record. This is not a saved shift settlement, rider cash deposit or cash-refund workflow.
- Active order detail refreshes in the foreground and on resume. Expired/locked codes are hidden and failures are visible. Café operators can renew an expired/locked delivery code after dispatch with a reason; riders cannot renew or retrieve customer codes. Delivered/pickup and cash status wording is clearer.

## Verification and limits

The restored code was checked again after temporary workspace cleanup. Earlier unsaved intermediate results are not used as proof for the final source.

- 49 shared/staff/location tests, 6 native component tests, 6 in-process backend HTTP contract tests, and 5 mocked Playwright browser flows pass: **66 frontend-related checks**.
- **86 backend tests** pass, including quote tampering/expiry/repricing, wallet changes, checkout-abandon races, customer isolation, contact validation, IST collection-day boundaries, rider access and late OTP renewal.
- Frontend lint and both type checks, staff production build, Android/iOS Hermes exports and fixture-boundary scan pass. Backend type checks, 41-route generation and Lambda build pass.
- Fresh dependency audit: **30 high, 18 moderate and 0 critical entries**, including propagated dependency chains. The security gate remains blocking; no blanket suppression or forced framework downgrade was added.
- Real Android/iPhone acceptance, native signing/prebuild compatibility, live Cognito/DynamoDB/API Gateway integration, GitHub CI and store submission have not run. Hermes exports are not signed APK/AAB/IPA builds.
- Browser tests use synthetic data/mocked HTTP; native component tests mock OS services. Contract tests use actual Fastify services with injected identities and the transactional memory store. They do not establish live AWS behaviour or complete scenario coverage.

Evidence: `cod-batch-checks.txt`, `cod-batch-contracts.txt`, `cod-batch-browser.txt`, `dependency-audit.json` and `verification.json`. Backend evidence is in the adjacent backend docs folder.

## Second-review corrections

- Unpaid orders remain visible after handoff; paid orders correctly leave the active queue after collection. Browser tests check both states.
- OTP lockout also blocks retrieval of an unusable code; a reasoned café-only renewal resolves delayed deliveries.
- Cross-key data leakage, stale quote consent, late checkout/abandon races, old journal cleanup and denied/slow/imprecise location have regression checks.
- Cash indexing is checked across the UTC/IST date boundary, independently of order creation time.

## Remaining production blockers

| Area | Remaining work |
|---|---|
| Security | Resolve or specifically review dependency findings and validate native dependency compatibility. |
| Live environment | Deploy the matching API/routes, configure actual outlet/auth settings, and test session expiry/re-auth, revocation/roles, CORS/CSP and DynamoDB transactions. |
| Devices | Verify location/search accuracy, permission denial, return from Maps, keyboards, back navigation, safe areas, screen readers/large fonts, foreground/resume and keychain payload size on Android/iPhone. |
| Customer completion | Normal basket persistence/editing, approved food images/details, actual pickup address, monitored support contact and ticket follow-up remain. |
| Privacy | Publish approved privacy/terms/support links and complete operational erasure/retention handling. Current closure disables access and queues review. |
| Business rules | Decide tax/invoices, cash refunds/reward reversals, referral eligibility following cancellation, reward rounding and venue schedule/promotion rules. Implement the corresponding agreed behaviour. |
| COD exceptions | Issue reporting exists; audited final failed-delivery disposition, prepared-food stock treatment, cash refunds and shift settlement remain. No automatic restocking of prepared food was invented. |
| Operations | Improve history-wide order polling/pagination, stock-edit concurrency, new-order alerts and production monitoring/rollback. |
| Release | Execute real private CI, approve branding/listings, create signed internal builds and run device acceptance before store submission. |

## Coordinated migration

1. Deploy matching frontend/backend versions. COD checkout now requires a quoteToken from POST /v1/quotes; old clients without quote acceptance are rejected.
2. Merge the generated 41-route OpenTofu route map. New routes cover outlet status, serviceability, checkout reconciliation, named riders, dated cash collections and delivery issues. Shared gateway audience `public` does not bypass the application's cryptographic authentication. No infrastructure has been applied.
3. Configure the actual `PICKUP_ADDRESS`. Pickup checkout is blocked without it. Cloud orders remain disabled by default.
4. Re-enable existing riders with display names to populate the directory. Existing saved addresses need recipient contact before delivery. The new cash index covers collections made by this version; historical backfill needs separate review.
5. Quote signing uses a domain-separated HMAC with the existing secret pepper. Rotation invalidates outstanding ten-minute quotes and delivery codes; coordinate recovery.
6. Keep abandonment markers beyond the lifetime of late requests/retries. This version adds no marker TTL; do not introduce a short replay window without review.
7. Install with npm ci and rebuild the native development/internal app for the added expo-location module/plugin. No signing files or real credentials are included.

## Next batch

Finish basket persistence/editing, support/privacy journeys, approved product/venue content and agreed COD exception/refund rules, then execute live staging and physical-device acceptance. Production-ready status must follow that evidence; passing these local checks alone is insufficient.
