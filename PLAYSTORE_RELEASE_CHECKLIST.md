# Play Store release checklist

This repository is now close to Android production, but a real Play Store launch still needs the owner to finish the last live-service tasks:

1. Create the Play Console app and complete the Data safety form using the published privacy policy and account deletion URLs.
2. Publish the Vercel frontend and use these public pages in Play Console:
   - `/privacy-policy.html`
   - `/account-deletion.html`
3. Configure production API, socket, Google Maps, Twilio, Razorpay, PostgreSQL, Redis, and Sentry secrets.
4. Restrict the Android Google Maps API key to package `com.aptrucking.mobile` and your release SHA-1 fingerprint.
5. Build a signed Android App Bundle with the EAS production profile.
6. Test login, OTP, payments, trip lifecycle, background tracking, and settlement review on at least one physical Android device.
7. Verify support email, escalation flow, and account deletion SLA before submitting to Play review.
