# Email Triage Agent

Simple Google Apps Script MVP for an email triage assessment.

GitHub repo note:
- default branch should be `main`
- the working source lives in `src/`

## 1. Project Purpose

This project reads messages from a dedicated Gmail inbox, classifies whether each email is a real service request, extracts the requested service location, resolves whether that location is inside Oakville, Ontario, and then either drafts, sends, clarifies, ignores, or flags the message for manual review.

The implementation is intentionally small and explainable so it can be demonstrated in a short assessment debrief.

## Submission Artifacts

- [Design Summary](DESIGN_SUMMARY.md)
- [Test Summary](TEST_SUMMARY.md)
- [Decision Log](DECISION_LOG.md)
- [AI Assistance Transcript](AI_ASSISTANCE_TRANSCRIPT.md)
- [Assumptions](ASSUMPTIONS.md)
- [Next Steps](NEXT_STEPS.md)
- [Debrief Guide](DEBRIEF_GUIDE.md)
- Demo video: submitted separately with the assessment materials

## Current Submission Status

- The end-to-end Gmail workflow has been run.
- The latest evaluated generator batch used `send` mode.
- Eleven final message outcomes were manually reviewed.
- The repository contains the agent and all required supporting written artifacts.
- The demo video will be submitted separately with the assessment materials.
- A redacted native AI conversation export will also be submitted separately.

## 2. Assessment Requirements

The system must:

- read inbox messages from Gmail;
- detect genuine service requests;
- extract the service location;
- determine whether the location is in Oakville;
- take the correct action;
- log the classification, evidence, location result, action, and execution outcome;
- avoid duplicate processing with message-level processed state.

## 3. Architecture

```text
Official virtual email generator
        ->
Dedicated Gmail inbox
        ->
Google Apps Script Gmail reader
        ->
Email body cleaning
        ->
LLM structured extraction
        ->
LLM semantic jurisdiction assessment
        ->
Deterministic Oakville resolver
        ->
Deterministic decision engine
        ->
Fixed reply template
        ->
Dry run, Gmail draft, or Gmail reply
        ->
Message-level dedupe, Gmail labels, and audit log
```

## 4. Why Google Apps Script

Google Apps Script is the best fit for the assessment because it can:

- access Gmail directly with `GmailApp`;
- create labels and drafts without custom infrastructure;
- run with the built-in Google authorization flow;
- be pasted into the assessment environment quickly.

## 5. Why a Dedicated Gmail Account

A dedicated Gmail account keeps the assessment isolated from personal mail and makes it easy to:

- test with the official generator;
- see processed labels clearly;
- avoid reply-loop risk;
- reset or rerun batches without side effects.

## 6. Manual Gmail Account Setup

1. Create a new Gmail account manually.
2. Sign into that account in your browser.
3. Keep that inbox dedicated to the assessment only.

Do not automate account creation, phone verification, CAPTCHA, or authorization.

## 7. Apps Script Project Setup

1. Open Google Apps Script while signed into the dedicated Gmail account.
2. Create a new project.
3. Add the files from `src/` into the project.
4. Save the project.

## 8. Add the Gemini API Key

Store the Gemini key in Script Properties:

- key: `GEMINI_API_KEY`
- optional model key: `GEMINI_MODEL`

Recommended model default:

- `gemini-3.1-flash-lite`

## 9. Authorize Gmail Access

1. Run `processInbox()` once from the Apps Script editor.
2. Approve the Gmail and Drive permissions Google requests.
3. Confirm the script can create the log sheet and label.

## 10. Execution Mode

`ACTION_MODE` lives in `src/Config.gs`.

Allowed values:

- `dry_run`
- `draft`
- `send`

Default:

```javascript
const ACTION_MODE = "dry_run";
```

Use `dry_run` first. It classifies and logs without sending, drafting, applying Gmail labels, or marking message IDs as processed. Dry runs are repeatable, so the same messages may appear in multiple dry-run log batches; filter by `run_id` to inspect one execution.

## 11. Google Sheet Log

The logger creates or reuses a sheet named:

`AI Triage Log`

The first row contains the audit columns. Each processed message appends one row with:

- run ID for the current `processInbox()` execution;
- thread and message IDs;
- sender and recipient;
- subject;
- raw plain-text email body;
- cleaned body sent to Gemini;
- predicted intent;
- Gemini evidence, confidence, uncertainty reason, raw response, and normalized JSON;
- Gemini location type, jurisdiction, city, province, country, and location confidence;
- extracted location text;
- resolved location;
- canonical Oakville decision;
- action;
- mode;
- execution result;
- error if any.

## 12. Local Deterministic Tests

Run:

```javascript
runLocalTests();
```

This checks:

- intent normalization;
- Oakville location resolution;
- high-confidence outside-city rejection;
- low-confidence and unverified-location manual review;
- neighbourhood-versus-street-name handling;
- message-level idempotency helpers;
- execution safety for `manual_review`, `ignore`, and invalid action modes;
- clarification logic;
- manual-review logic;
- reply template filling.

These tests do not require Gmail authorization.

## 13. Running `processInbox()`

1. Set `ACTION_MODE` to `dry_run` first.
2. Save the script.
3. Run `processInbox()`.
4. Review the execution log and Google Sheet output.
5. Move to `draft` only after you trust the classifications.
6. Use `send` only if you want live replies.

## 14. Official Virtual Email Generator

Use the assessment generator at:

https://affableapps.com/email-exercise/

Enter the dedicated Gmail address and trigger a batch of test emails. The script reads candidate inbox threads and processes the newest inbound message whose message ID has not been marked processed in non-dry execution.

## 15. Intent Classification

The LLM returns structured JSON with:

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

The allowed intent values are:

- `service_request`
- `non_service`
- `uncertain`

The LLM does not decide final email actions.

For clearly named cities or municipalities, Gemini may use general geographic knowledge to classify the jurisdiction as `oakville`, `outside_oakville`, or `unknown`. Deterministic code still makes the final action decision.

## 16. Service-Location Extraction

The classifier only extracts the location mentioned in the email. It does not guess from:

- the sender address;
- the sender residence;
- the email signature;
- attachments;
- historical context.

If the location is missing, too vague, conflicting, or only an address/intersection/postal code without a confirmed municipality, the resolver returns a conservative unverified or unknown result.

## 17. Deterministic Oakville Resolution

The resolver uses simple rules:

- Oakville and known Oakville neighbourhoods count as Oakville;
- clearly identified high-confidence outside cities or municipalities count as outside Oakville;
- street addresses, postal codes, intersections, and ambiguous names are not automatically accepted or rejected;
- Oakville neighbourhood keywords do not trigger automatic acceptance when they are used as street names, such as `Bronte Road` or `College Park Drive`;
- the decision engine handles uncertainty instead of guessing.

## 18. Duplicate Prevention

The script searches candidate inbox threads with:

```text
in:inbox
```

It then performs message-level deduplication in code using `message.getId()` and Script Properties. A processed Gmail thread can still be inspected later if the customer sends a new inbound message in that same thread.

The `AI_TRIAGE_PROCESSED` Gmail label remains as a visual marker in non-dry modes, but it is not the only idempotency mechanism.

## 19. Draft and Send Behavior

- `dry_run`: classify and log without Gmail replies or labels
- `draft`: create a draft reply
- `send`: send the reply immediately

Fixed templates are used so the model cannot invent customer-facing wording.

Only `accept`, `reject`, and `clarify` can create a draft or send an email. `ignore` never replies.

`manual_review` never creates a customer-facing draft or sent reply. In `dry_run`, manual review is simulated only: no Gmail label is applied, `performed` is `false`, and `execution_kind` is `dry_run_manual_review`. In `draft` and `send`, manual review applies the internal `AI_TRIAGE_MANUAL_REVIEW` label and records `queued_for_manual_review` with `performed` set to `true`.

Switching from `dry_run` to `draft` can process the same batch because dry runs do not create processed-message state. `draft` and `send` mark message IDs as processed after successful action execution.

## 20. Logging Behavior

Every processed message logs the classification and action decision to Google Sheets. Failures are also logged so one bad email does not stop the run.

Each `processInbox()` call creates one `run_id`. Filter the `run_id` column in `AI Triage Log` to the latest value to see only the current run. The `email_body` column stores the raw plain-text Gmail body for audit review, while the classifier still uses the cleaned body internally.

## 21. Known Limitations

- Gmail and Apps Script authorization are manual.
- The Gemini call depends on your Script Properties key.
- Attachments are ignored.
- HTML cleanup is basic.
- The Oakville resolver uses deterministic text rules, not geospatial boundary data.
- Without an external geographic lookup API, the system cannot determine the municipal boundary of every arbitrary street address.
- The resolver does not claim to identify every world location with 100% accuracy.
- Automatic rejection applies only to clearly identified, high-confidence non-Oakville cities or municipalities.

## 22. Privacy and Security

- Do not commit API keys.
- Do not use personal mailboxes for the assessment.
- Use `dry_run` before enabling any reply mode.
- Keep manual review for uncertain cases.

## 23. Production Migration

For a real tax or professional-services company, the mailbox layer would likely move to Microsoft 365 shared mailboxes and Microsoft Graph. The classifier, location resolver, action engine, templates, and logging concepts can stay the same.

## 24. Troubleshooting

- Missing API key: set `GEMINI_API_KEY` in Script Properties.
- If you want to override the default model, set `GEMINI_MODEL`.
- Gmail authorization error: rerun `processInbox()` and approve permissions.
- Log sheet creation error: verify the Apps Script project can access Drive and Sheets.
- Invalid model JSON: inspect the Gemini response and keep `dry_run` enabled until stable.
- Unexpected replies: confirm `ACTION_MODE` is still `dry_run` or `draft`.

## Final Submission Checklist

- [x] Agent source code
- [x] Design summary
- [x] Test summary
- [x] Decision log
- [x] Selected AI-assistance transcript
- [x] Assumptions list
- [x] One-day next-steps note
- [x] Debrief preparation guide
- [x] Local deterministic tests passed: 53 checks
- [x] Google Apps Script tests passed: 53 checks
- [x] Official generator batch manually evaluated
- [ ] Demo video submitted separately
- [ ] Redacted native AI conversation export submitted separately
