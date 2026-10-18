# Security status — release blocked

The local dependency audit on 18 October2026 found transitive vulnerabilities. One chain was reduced by overriding xcode's uuid dependency to11.1.1, with a smoke check of xcode's uuid.v4-based identifier generation. Native prebuild/signing compatibility still needs a Mac/toolchain check.

Remaining root advisories include braces3.0.3, node-forge1.4.0 and sprintf-js1.1.3. Registry versions and upstream advisory pages were checked; no patched releases were listed for those versions at the time of this build. Do not invent patched version numbers or apply an incompatible framework downgrade suggested by npm audit fix --force.

- braces: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- node-forge: https://github.com/advisories/GHSA-86w9-cpqp-85rv
- sprintf-js: https://github.com/advisories/GHSA-hp3w-g68c-fv3c

The full dated npm audit output is included as dependency-audit.json. Counts include propagated vulnerability paths, not that many independent application flaws. Expo's npm dependency graph includes build/Metro/native tooling under ordinary dependencies, so npm's production-only count is not a direct inventory of shipped client vulnerabilities. Artifact reachability and exploitability require review. Neither fact is a waiver: the high-severity CI audit gate remains blocking.

Auth uses Cognito SRP, public clients and access tokens fetched through Amplify. Mobile identity secrets and pending requests use OS-backed SecureStore with no plaintext fallback. Staff tokens stay in browser memory; no tokens are stored in localStorage. No real credentials or signing files are in this package. API requests use HTTPS, omit cookies, reject redirects and have timeouts. UI role checks are not authorization; every mutation must be checked server-side.

Native storage size/keychain behavior, full JWT/provider testing, session expiry/suspension, distributed abuse controls and production CSP/CORS/security headers remain release gates. No security certification or 100% coverage is claimed.
