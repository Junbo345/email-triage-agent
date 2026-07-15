# Email Triage Agent

Simple Google Apps Script MVP for an email triage assessment.

GitHub repo note:
- default branch should be `main`
- the working source lives in `src/`

## 1. Project Purpose

This project reads messages from a dedicated Gmail inbox, classifies whether each email is a real service request, extracts the requested service location, resolves whether that location is inside Oakville, Ontario, and then either drafts, sends, clarifies, ignores, or flags the message for manual review.

The implementation is intentionally small and explainable so it can be demonstrated in a short assessment debrief.

## 2. Assessment Requirements

The system must:

- read inbox messages from Gmail;
- detect genuine service requests;
- extract the service location;
- determine whether the location is in Oakville;
- take the correct action;
- log the classification, evidence, location result, action, and execution outcome;
- avoid duplicate processing with a Gmail label.

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
Deterministic Oakville resolver
        ->
Deterministic decision engine
        ->
Fixed reply template
        ->
Dry run, Gmail draft, or Gmail reply
        ->
Processed Gmail label and audit log
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

Use `dry_run` first. It classifies and logs without sending or drafting.

## 11. Google Sheet Log

The logger creates or reuses a sheet named:

`AI Triage Log`

The first row contains the audit columns. Each processed message appends one row with:

- thread and message IDs;
- sender and recipient;
- subject;
- predicted intent;
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
- non-Oakville rejection;
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

Enter the dedicated Gmail address and trigger a batch of test emails. The script reads the Gmail inbox and processes messages that do not already have the processed label.

## 15. Intent Classification

The LLM returns structured JSON with:

- `intent`
- `service_location_text`
- `evidence`
- `confidence`
- `uncertainty_reason`

The allowed intent values are:

- `service_request`
- `non_service`
- `uncertain`

The LLM does not decide final email actions.

## 16. Service-Location Extraction

The classifier only extracts the location mentioned in the email. It does not guess from:

- the sender address;
- the sender residence;
- the email signature;
- attachments;
- historical context.

If the location is missing or too vague, the resolver returns `unknown`.

## 17. Deterministic Oakville Resolution

The resolver uses simple rules:

- Oakville and known Oakville neighborhoods count as Oakville;
- explicit outside locations are not Oakville;
- ambiguous locations become `unknown`;
- the decision engine handles uncertainty instead of guessing.

## 18. Duplicate Prevention

The script searches for:

```text
in:inbox -label:AI_TRIAGE_PROCESSED
```

After successful processing, the thread is labeled `AI_TRIAGE_PROCESSED`. That prevents reprocessing on later runs.

## 19. Draft and Send Behavior

- `dry_run`: log only
- `draft`: create a draft reply
- `send`: send the reply immediately

Fixed templates are used so the model cannot invent customer-facing wording.

## 20. Logging Behavior

Every processed message logs the classification and action decision to Google Sheets. Failures are also logged so one bad email does not stop the run.

## 21. Known Limitations

- Gmail and Apps Script authorization are manual.
- The Gemini call depends on your Script Properties key.
- Attachments are ignored.
- HTML cleanup is basic.
- The Oakville resolver uses deterministic text rules, not geospatial boundary data.

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
