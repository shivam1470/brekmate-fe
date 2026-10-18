# COD batch 1 update

Initial release is COD only. Read ../brekmate-fe/docs/COD_BATCH_REVIEW.md from this folder for implemented work, migration and remaining release gates. Deploy matching frontend/backend versions: COD now requires a server quote token. Merge the generated 41-route map. Configure actual PICKUP_ADDRESS. Do not enable live orders or mark production-ready.

# Continue frontend development

Read README.md, docs/SETUP.md, docs/RELEASE_GATES.md and docs/SECURITY.md. Install with npm ci using Node24. Run npm run check, npm run test:ui and, with the backend adjacent, npm run test:backend.

Follow TDD for each new behavior: write a failing test with a realistic actor/state/failure, run it, implement the smallest safe change, then run the affected suite. Add device-level acceptance rather than multiplying arithmetic fixtures to inflate E2E counts.

Keep customer screens native. Publish only apps/staff/dist as the staff website. Test browser harnesses are not product entry points. Do not introduce sample data or fixture-token login into production apps. Missing configuration must fail closed.

Never use client totals, role visibility, locally decoded claims or wallet arithmetic as authorization/payment truth. Preserve server quotes and idempotency keys. An uncertain checkout must recover using its original key/body, including after logout/restart. Do not clear a previously uncertain journal just because a later request cannot authenticate.

The backend contract suite consumes ../brekmate-be and its dependencies. It uses the actual API/services with in-memory storage and injected identities; it does not validate AWS or live Cognito. Native Maestro files are authored templates and have not run on devices.

Current security audit findings block release. The xcode→uuid override was checked against the dependency's use of uuid.v4, but native prebuild/signing validation remains outstanding. Do not run npm audit fix --force: it suggests incompatible framework downgrades and would not constitute a reviewed remedy.

No GitHub push, cloud deployment, build-service purchase, credential provisioning, external message or store submission was performed. Source and archives are saved in the BrekMate Drive folder for review and continuation.
