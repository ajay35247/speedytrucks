# Play Store release checklist

This repository is code-ready for an Android release pipeline, but a real Play Store launch still requires manual owner steps:

1. Create a Play Console app and complete the Data safety form.
2. Publish a privacy policy URL and support email.
3. Explain background location usage with clear trip-tracking business need.
4. Configure production API, socket, maps, Twilio, Razorpay, PostgreSQL, Redis, and Sentry secrets.
5. Build a signed Android App Bundle with EAS production profile.
6. Test login, OTP, payments, trip lifecycle, and background tracking on at least one physical Android device.
7. Verify account deletion/support flow before submitting to Play review.
