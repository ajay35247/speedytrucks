# Account deletion process

Public user-facing deletion page:
- `frontend/public/account-deletion.html`

Recommended support handling flow:
1. Verify ownership through registered mobile number or signed-in user email.
2. Revoke all active refresh tokens and sessions.
3. Mark the account inactive or deleted in the operational system.
4. Retain finance, tax, fraud, and audit records only where legally required.
5. Confirm completion to the requester.

Suggested SLA:
- Acknowledge within 1 business day
- Complete within 7 business days
