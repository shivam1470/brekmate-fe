# BrekMate frontend — native customer + team web

An npm workspace with an Expo/React Native customer application for Android and iOS, a responsive React/Vite staff/admin/rider workspace, and shared TypeScript API/cart/authentication code. It implements the available BrekMate backend contracts. It is not a signed or published store release.

## Run

Use Node24 and npm. From this folder:

```bash
npm ci
npm run typecheck
npm test
npm run test:native
npm run dev:staff
npm run dev:mobile
```

Create local environment files using the names in `docs/SETUP.md`. Real credentials, signing keys and customer data must not be saved in this folder or Drive. Cognito pool/client IDs and the API origin are public configuration, not AWS access credentials. Missing identity/API configuration displays a setup screen; production builds do not provide fixture login tokens or sample orders.

## Workspace

| Path | Purpose |
| --- | --- |
| apps/mobile | React Native customer application, Expo58 / React Native0.88 |
| apps/staff | React19 / Vite staff, manager, kitchen and rider browser UI |
| packages/core | API transport, Cognito integration, types, cart/pricing-input helpers, mutation journal and hooks |
| assets | Local Lato/Bodoni fonts, licenses and a draft BrekMate monogram app icon |
| test | Unit, staff interaction and native component tests; browser-only fixture harnesses |
| e2e | Playwright browser tests and unexecuted Maestro staging device flows |
| integration | Tests against the previously created backend; needs sibling brekmate-be checkout |
| docs | Setup, API mapping, verification, design decisions and release gates |

The customer app has catalogue/search/categories, item add-ons/instructions, basket quantities, server quotes, pickup/delivery, COD checkout/recovery, order history/status/OTP, reorder, rewards/referral, celebrations, saved addresses, profile/marketing preferences, notifications, support and account closure request screens.

The team workspace supports role-sensitive order queues, acceptance/preparation/handoff, rider assignment, OTP issuance/verification, explicit cash receipt confirmation, catalogue/stock editing, booking confirmation/cancellation/photo-delivery recording, support/privacy/audit reads and outlet/rider controls. All authorization is enforced by the backend; hidden buttons are only a usability aid.

## Verification and builds

```bash
npm run check
npx playwright install chromium
npm run test:ui
# With the prepared backend next to this folder, and its dependencies installed:
npm run test:backend
npm run package
```

`npm run check` type-checks both applications, runs unit/staff/native component tests and builds the web app plus Android/iOS JavaScript exports. Browser tests use explicit fixture identities and network responses; backend contract tests call the real backend in-process with test authentication/storage. Neither proves live AWS or native device E2E.

Archives: `artifacts/BrekMate_Frontend_Source.zip`, `BrekMate_Staff_Web_Build.zip` and `BrekMate_Native_JS_Exports.zip`. The native export contains JavaScript/Hermes bundles and assets; it is **not an APK, AAB or IPA**. Signed native builds require your Mac/toolchains or an explicitly configured build service.

## Release status

See `docs/RELEASE_GATES.md` and `docs/SECURITY.md`. Online payments/refunds and external messaging depend on unfinished backend work. Addresses now support foreground location, native address lookup, external Maps verification and manual fallback. See docs/COD_BATCH_REVIEW.md. Store publishing, identity/device testing, complete privacy erasure and dependency security findings remain open. No GitHub push, deployment, paid build, store submission or customer message was performed.

## Coordinated review — 18 October 2026

Current findings, checks and release blockers: [release review](docs/release-2026-10-18/RELEASE_CHECKLIST.md). This review supersedes historical passing counts; no deployment or production approval is granted.
