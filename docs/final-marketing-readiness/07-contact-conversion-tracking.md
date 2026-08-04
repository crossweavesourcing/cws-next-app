# Contact Conversion Tracking

Implemented:

- `contact_form_start` fires when the contact form opens confirmation flow.
- `generate_lead` fires only after server-confirmed contact submission success.
- `contact_form_error` fires on rejected/failed submission.
- Event IDs use the form idempotency key where available.
- PII keys such as name, email, phone, company, message, file, token, and session are stripped before `dataLayer` push.

Not implemented:

- A separate quote form was not found in the inspected application; `request_quote` remains supported in the event dictionary but no fake quote flow was created.
