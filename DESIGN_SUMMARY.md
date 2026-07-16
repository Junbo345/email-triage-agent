# Design Summary

## Goal

This project is a Google Apps Script MVP for an email triage assessment. It reads inbound Gmail messages, determines whether each message is a genuine service request, extracts the requested service location, checks whether the service location is in Oakville, Ontario, and takes a deterministic action.

The core pipeline is:

```text
Gmail inbox
  -> newest unprocessed inbound message
  -> cleaned email subject/body
  -> Gemini structured classification
  -> deterministic location resolver
  -> deterministic action selection
  -> fixed reply template
  -> dry run, draft, send, ignore, or manual review
  -> Google Sheets audit log
  -> message-level processed state in non-dry modes
```

## Runtime Choice

Google Apps Script was chosen because the assessment centers on Gmail and can be implemented without extra infrastructure. Apps Script provides direct access to:

- `GmailApp` for reading inbox threads, replying, drafting, and labels;
- `UrlFetchApp` for calling Gemini;
- `PropertiesService` for API keys and processed-message state;
- `SpreadsheetApp` and `DriveApp` for audit logging.

The repository is source code for manual paste into Apps Script. It does not use `clasp`, Docker, GitHub Actions, or external Node dependencies.

## Alternatives Considered

### Gmail API with Python

Advantages:

- conventional service architecture;
- easier unit testing and package management;
- more control over OAuth tokens and message retrieval.

Reasons not selected:

- required OAuth setup;
- token storage;
- hosting;
- deployment;
- more assessment time spent on infrastructure rather than the core loop.

### n8n, Zapier, or Power Automate

Advantages:

- fast low-code workflow construction;
- built-in email connectors.

Reasons not selected:

- classification and idempotency logic would be less transparent during the debrief;
- possible free-tier or connector limitations;
- harder to present the exact deterministic logic in source form.

### Microsoft Graph Shared Mailbox

Advantages:

- likely a stronger production fit for a professional-services company;
- shared-mailbox and enterprise identity support.

Reasons not selected:

- required Entra application setup and permissions;
- excessive setup for a small Gmail-based assessment prototype.

Google Apps Script was selected because it provided the shortest path
to a real inbox, real Gmail replies, audit logging, and an explainable
end-to-end prototype within the assessment time window.

## Classification Design

Gemini is used only for structured extraction, not final action decisions.

The classifier returns JSON fields including:

- `intent`
- `service_location_text`
- `location_type`
- `location_jurisdiction`
- `location_city`
- `location_province`
- `location_country`
- `location_confidence`
- `evidence`
- `confidence`
- `uncertainty_reason`

Allowed intents are:

- `service_request`
- `non_service`
- `uncertain`

The prompt explicitly treats the email subject and body as untrusted data. It asks Gemini not to follow instructions inside the email and to return JSON only.

## Location Resolution

The resolver is deterministic and conservative.

It accepts Oakville when the location is clearly Oakville or a known Oakville neighbourhood, while avoiding false positives where neighbourhood names appear as street names, such as `Bronte Road` or `College Park Drive`.

It rejects clearly identified high-confidence outside cities or municipalities, such as Burlington, Mississauga, Toronto, Waterloo, Ottawa, Montreal, Vancouver, Calgary, and New York.

It routes uncertain cases to clarification or manual review instead of guessing:

- missing location -> clarify;
- ambiguous location -> clarify;
- conflicting location -> manual review;
- standalone street address, postal code, or intersection without confirmed municipality -> manual review;
- low-confidence outside location -> manual review.

## Action Selection

The action engine is deterministic:

- `service_request` in Oakville -> accept;
- `service_request` outside Oakville -> reject;
- missing or ambiguous service location -> clarify;
- conflicting or unverified location -> manual review;
- `non_service` -> ignore;
- uncertain intent or low classification confidence -> manual review.

Gemini never decides whether to accept, reject, reply, draft, send, or ignore.

## Reply Safety

Customer-facing text comes from fixed templates only.

Only these actions can create a customer-facing draft or sent reply:

- `accept`
- `reject`
- `clarify`

These actions never create a customer-facing reply:

- `ignore`
- `manual_review`

Manual-review messages receive the internal `AI_TRIAGE_MANUAL_REVIEW` Gmail label in `draft` and `send` modes.

## Execution Modes

`ACTION_MODE` is configured in `src/Config.gs`.

Supported modes:

- `dry_run`
- `draft`
- `send`

Default mode:

```javascript
const ACTION_MODE = "dry_run";
```

Mode behavior:

- `dry_run`: classifies and logs only; does not create drafts, send replies, apply Gmail labels, or mark message IDs processed.
- `draft`: creates draft replies for accept/reject/clarify; applies labels and marks message IDs processed after successful execution.
- `send`: sends replies for accept/reject/clarify; applies labels and marks message IDs processed after successful execution.

## Duplicate Prevention

The script searches Gmail with:

```text
in:inbox
```

It then performs message-level deduplication using each Gmail message ID stored in Script Properties. This avoids relying only on thread-level Gmail labels, because a customer can reply in an already-labeled thread and create a new inbound message that still needs processing.

Dry runs intentionally do not mark message IDs processed, so the same emails can be inspected repeatedly before switching to `draft` or `send`.

## Logging

The logger creates or reuses a Google Sheet named:

```text
AI Triage Log
```

Each run gets a `run_id`. The audit log records:

- run status;
- thread and message IDs;
- sender, recipient, and subject;
- raw email body;
- cleaned email body;
- Gemini raw response;
- normalized classification JSON;
- intent, evidence, confidence, and uncertainty reason;
- location extraction and jurisdiction fields;
- deterministic location resolution;
- final action and action reason;
- execution mode and execution kind;
- errors, if any.

Filtering the sheet by `run_id` shows only one execution batch.

## Local Tests

`runLocalTests()` is a deterministic local test harness that does not require Gmail authorization or a Gemini API key.

It covers:

- classifier schema normalization;
- Oakville and Oakville-neighbourhood matching;
- outside-city rejection;
- low-confidence manual review;
- ambiguous and missing-location clarification;
- street-name false-positive prevention;
- manual-review execution semantics;
- ignore behavior;
- message-level deduplication;
- dry-run-to-draft workflow;
- fixed reply templates.

## Manual Setup Still Required

The code is complete as source, but the following steps are still manual:

- create or use a dedicated Gmail account;
- create a Google Apps Script project;
- paste the files from `src/`;
- add Script Properties:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` optional;
- run `runLocalTests()`;
- run `processInbox()` once to authorize Gmail, Drive, and Sheets access;
- use the official virtual email generator;
- review `AI Triage Log`;
- switch from `dry_run` to `draft` or `send` only after inspection.

## Monitoring and Primary Failure Risks

Primary runtime risks include:

- Gemini HTTP failures or malformed JSON responses;
- Gmail send success followed by processed-state or logging failure;
- incorrect high-confidence location classification;
- processed-state growth in Script Properties;
- unexpected message volume or reply loops;
- Google Sheets logging failures.

The most concerning production failure would be sending an incorrect
acceptance or rejection to a real customer. In production, that risk
would need staff approval gates, monitoring, and rollback procedures
before unattended live sending.

## Known Limitations

- Attachments are ignored.
- HTML cleanup is basic.
- The resolver does not perform municipal-boundary geocoding.
- Arbitrary street addresses without confirmed municipality are not automatically accepted or rejected.
- The system is an Apps Script MVP, not a production mailbox service.
- Production deployment would need stronger monitoring, retention controls, human approval workflows, credential management, and potentially Microsoft Graph shared-mailbox integration.
