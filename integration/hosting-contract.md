# Staff hosting contract

Publish only apps/staff/dist, built with the real VITE_API_ORIGIN and staff Cognito configuration. Serve over HTTPS from the prepared private S3/CloudFront setup. No customer website is part of this deployment.

Review CloudFront response headers before deployment: CSP connect-src must allow the exact API origin and regional Cognito endpoint used by the staff pool (for the proposed Mumbai region, https://cognito-idp.ap-south-1.amazonaws.com). A self-only connection policy will block authentication/API calls. Use the actual deployed origins, not a wildcard. The local browser harness does not test these production headers.

Use self-hosted script/style/font assets, frame-ancestors 'none', object-src 'none', base-uri 'self', strict transport security after verifying the HTTPS/domain setup, X-Content-Type-Options nosniff and an appropriate referrer policy. Test the precise final CSP against the generated bundle; no inline/eval exception should be added casually. Never host the repository root, test pages or environment files.

CORS belongs to the API Gateway/backend origin policy and must include the exact staff HTTPS origin. Browser tokens are sent as bearer headers, with credentials omitted. Native apps do not use browser CORS.

The runtime integration patch from brekmate-be must already be reviewed/applied. Customer/staff shared API routes still require application token verification even where the gateway route audience is called public. No frontend role check can replace backend authorization.

No CloudFront/S3 resource, DNS setting, header policy or API CORS setting was changed by this frontend task. Run real-origin acceptance before production promotion.
