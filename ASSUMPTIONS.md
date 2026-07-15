# Assumptions

- The relevant location is where the requested service will occur.
- The sender's current residence is not automatically the service location.
- Email-signature addresses are not automatically service locations.
- Oakville neighborhoods such as Bronte count as Oakville.
- A clearly future service at a future Oakville property counts as Oakville.
- Missing or conflicting locations produce `unknown`.
- Missing locations result in a clarification request.
- Uncertain intent results in manual review.
- Non-service messages receive no reply.
- Fixed templates prevent unsupported promises.
- The business serves Oakville only.
- No distance buffer outside Oakville is assumed.
- The dedicated Gmail account is used only for the assessment.
- The generator may send repeated or similar messages.
- Already processed threads should not be processed twice.
- Attachments are not required for intent or location classification in the prototype.
- Google Apps Script is the prototype mailbox adapter.
- Microsoft 365 Shared Mailbox plus Microsoft Graph is the preferred production mailbox approach for a tax-services company.

