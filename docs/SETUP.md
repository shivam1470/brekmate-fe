# Setup and deployment handoff

## API and identity configuration

Create `apps/mobile/.env.local` locally with public settings:

```dotenv
EXPO_PUBLIC_API_ORIGIN=https://YOUR_HTTP_API_ORIGIN
EXPO_PUBLIC_CUSTOMER_POOL_ID=ap-south-1_REPLACE
EXPO_PUBLIC_CUSTOMER_CLIENT_ID=REPLACE
APP_VARIANT=development
```

Create `apps/staff/.env.local` locally:

```dotenv
VITE_API_ORIGIN=https://YOUR_HTTP_API_ORIGIN
VITE_STAFF_POOL_ID=ap-south-1_REPLACE
VITE_STAFF_CLIENT_ID=REPLACE
```

Use the existing Cognito public clients with email/SRP. Staff signup is admin-managed and TOTP/new-password challenges are supported. Customer signup, email confirmation/resend and password reset are included. Phone-login OTP is not implemented. Never put an AWS access key, pool client secret or gateway secret into frontend environment variables. Public Expo/Vite variables are compiled into distributable code.

The API origin must be an HTTPS origin without a path prefix. Local HTTP is accepted only by native development builds for localhost/127.0.0.1/Android emulator10.0.2.2. Use an HTTPS staging API for physical devices. The previously created backend's local server has fixture tokens; these frontends deliberately do not provide a production fixture-auth mode, so a complete local authenticated setup needs a test Cognito configuration or a dedicated development-only integration harness.

The staff build needs explicit allowed HTTPS origins in API Gateway CORS. Do not expose a development server publicly. There is no wildcard CORS fallback in this frontend. The backend integration patch and deployment settings must be completed before live requests work.

## Identity and data storage

Mobile tokens and mutation journals use Expo SecureStore through a namespaced Vault adapter; there is no plaintext fallback. Payload-size and OS keychain behavior must be verified on real devices. Tokens are held only in memory on the staff browser; reloading requires sign-in again. Staff mutation journals are also in memory and do not survive browser reloads. Recheck order state before repeating an action after reload.

API calls request access tokens from Amplify, allowing its refresh lifecycle. Unauthorised errors are shown to the user; the user can sign out and sign in again. Full session-expiry and suspension UX needs live-pool validation.

## Native builds on your Mac

Install the supported Xcode and Android toolchains for the pinned Expo SDK. From `apps/mobile`, use Expo run commands to create local native projects; review permissions and identifiers before any store build. The default variant is development, with bundle/package ID `com.brekmate.customer.dev`. Staging uses `.staging`; production uses `com.brekmate.customer`. These identifiers are proposed and must be checked against your accounts.

`app.config.ts` requires actual HTTPS API and identity values for staging/production variants. `eas.json` has internal preview and production profiles but contains no project/account IDs, signing credentials or submission authorization. Set up your own Expo/build account only when needed; no paid build service was used here. Local native builds remain an option.

A signed AAB and IPA/archive, Android/iOS device acceptance, privacy metadata, support/privacy URLs, screenshots and store account setup are required before release. Do not confuse `expo export` output with a signed store package.

## Staff web hosting

Run `npm run build:staff`. Deploy only the contents of `apps/staff/dist` (or the staff build ZIP) to the prepared private S3/CloudFront origin. Do not publish the repository root, test harnesses, native-preview pages, source or environment files. Verify HTTPS, CORS, security headers and authentication with the real staff pool before deployment promotion. The generated files are ready for review, not already hosted.

## Tests

Use Node24. `npm run test:backend` expects the prepared backend at `../brekmate-be`; install that folder's dependencies first. Default frontend checks do not silently skip this suite; it is a separate explicit integration command.

Playwright tests run against a local test-only Vite server, with fake network responses and no real customer operations. Native Maestro templates target **only** `com.brekmate.customer.staging` and require `TEST_ENV=staging`. They have not been run on a device. Seed a controlled staging product/account and never point those flows at a production binary or account.

## COD batch 1

Use matching backend and generated 41-route map. Configure the actual PICKUP_ADDRESS. Install with npm ci and create a new native development/internal build for expo-location. See COD_BATCH_REVIEW.md for migrations, checkpoint recovery and outstanding release gates.
