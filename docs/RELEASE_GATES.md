# Remaining work before production

The frontend implements the available backend core. Passing tests and export builds do not make it a store-ready release.

1. Resolve/review the dependency findings in SECURITY.md. The CI audit gate deliberately fails while high-severity findings remain. No blanket suppression or forced downgrade is included.
2. Configure real customer/staff Cognito pools and HTTPS API, test sign-in/signup/confirmation/reset, staff TOTP setup, forced-password changes, expiry, refresh, revoked/suspended accounts and role changes. Browser/native tests currently inject identities.
3. Run on the user's Android and iPhone/Mac with the supported native toolchains. Verify touch targets, screen reader, dynamic font scaling, safe areas, keyboard avoidance, rotation/tablet layouts, OS back behavior and offline/resume state.
4. Verify SecureStore token and pending-checkout payload sizes on both OSes. Customer cart editing state is currently in memory; only pending checkout bodies/keys survive restart. Staff browser journals are memory-only and require order-state reconciliation after reload.
5. COD batch 1 implements signed quote acceptance and atomic checkout reconciliation/abandonment. Verify them against live DynamoDB, real auth and interrupted native processes. See COD_BATCH_REVIEW.md.
6. Initial launch is COD only. Online providers/webhooks are deferred. Complete agreed cash-refund, failed-delivery disposition and reward reversal handling.
7. Complete privacy erasure/export and customer-support response lifecycles. Account closure currently disables access and requests retention review; financial/order records and Cognito identity are not instantly erased.
8. Add approved product photography/image metadata and a customer-friendly address search/map picker. COD batch 1 adds one-time current location, native address lookup, external Maps verification and manual fallback; validate them on devices. Review venue promotion dates/inclusions, assistance, schedule and cancellation policies before offering confirmed reservations.
9. Approve the backend's tax, reward rounding and first-created-order referral policies before enabling live orders. The frontend never determines payable totals or credits client-side.
10. Finish push/email/SMS providers and preferences if required. Current notifications are an authenticated in-app feed; photos are shared manually by café staff and the browser records delivery with consent.
11. Replace history-wide staff counters with backend date-indexed reporting before calling them daily sales. Reporting/refund/customer-admin features with no backend APIs are not faked in the UI.
12. Verify real API Gateway CORS, JWT/ownership boundaries, throttling, CSP/security headers and CloudFront deployment. Test all production assets and routes from actual origins, with no test harness deployed.
13. Run the Maestro native templates after completing test identities and device setup. Add full Android+iOS and staff browser acceptance scenarios for network failures, payment/refund providers, deletes, upgrades and realistic data volumes.
14. Review app identifiers/icon, create signed native artifacts, complete privacy/support URLs and store metadata, and perform internal TestFlight/Play testing before submission. No signed native artifact or store submission exists yet.
15. Pin CI action revisions to reviewed immutable SHAs and run CI in the real private repository. The workflow file has been authored, not executed on GitHub.

This is a reviewable development baseline. No claim of complete scenario coverage, 100% coverage, 30k native E2E tests or unattended production readiness is made.
