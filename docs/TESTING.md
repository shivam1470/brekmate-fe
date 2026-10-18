# COD batch 1 evidence

49 shared/staff/location + 6 native component + 6 backend contract + 5 browser checks pass: 66 total. See COD_BATCH_REVIEW.md and cod-batch-*.txt. The earlier baseline below is historical.

# Test evidence and scope

The implementation uses layered tests instead of claiming tens of thousands of native E2E scenarios.

- Shared domain/transport and staff React interaction suite:39 tests.
- React Native Testing Library component suite:4 tests, including configured menu add, empty basket, real server-quote usage and uncertain checkout recovery with the same key.
- Playwright browser suite:4 flows for staff acceptance, rider OTP/cash separation, role navigation and a test-only web rendering of the native menu/cart components. These use mocked HTTP responses.
- Backend contract suite:4 checks against the actual prepared Fastify/backend services, in-process, using test identities and the transactional memory store. These cover checkout/idempotency, COD lifecycle, forbidden staff action and celebration slot conflicts.

Recorded failing-test cycles caught loss of an uncertain checkout key after later authentication failure, inability to replay bodyless requests, an impossible calendar date rolling into a different month and a browser fetch invocation binding error. The fixes preserve those counterexamples in tests.

Android/iOS exports are JavaScript/Hermes build evidence, not signed native application builds. No device Maestro tests, live Cognito/AWS/provider tests, Play-store/App-store submission, GitHub CI run or complete accessibility audit has been performed.

Browser renders were inspected for desktop staff, mobile rider and a menu/cart component preview using synthetic data. Test screenshots are local QA intermediates, not product assets or public previews. Source contains no real customer data.

Run npm run check, npm run test:ui, then npm run test:backend with the adjacent backend installed. CI's dependency audit gate is expected to block until SECURITY.md is resolved. Future work must follow failing test → implementation → regression/refactor; test counts alone cannot establish complete scenario coverage.

A final regression also ensures a successful server order is shown even if local journal cleanup fails; cleanup failure must not become a false checkout failure.
