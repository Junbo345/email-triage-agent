# Decision Log

## 2026-07-14

- Started from an existing workspace that contained an unrelated Python project.
- Chose to create a separate `email-triage-agent` repo scaffold rather than retrofit the existing codebase.
- Selected Google Apps Script as the implementation target because it can read Gmail directly with `GmailApp`, create Gmail drafts/replies, create Drive/Sheets audit logs, and be manually pasted into a new Apps Script project quickly.
- Chose a dedicated Gmail account for the assessment so generated test emails stay isolated from personal mail and the script can be authorized safely.
- Kept `ACTION_MODE` set to `dry_run` by default so the first runs classify and log only, with no Gmail drafts or sends.
- Added fixed reply templates instead of letting the model write customer-facing replies. The model classifies and extracts data only; deterministic code decides and replies.
- Added deterministic local tests for intent normalization, Oakville location handling, non-Oakville rejection, clarification, manual review, and reply template filling.
- Created documentation files for assumptions, test summary, next steps, and setup instructions.

## 2026-07-15

- Created the GitHub repository under `Junbo345/email-triage-agent`, pushed the Apps Script MVP, and renamed the default branch to `main`.
- Switched the classifier integration from OpenAI-style API assumptions to the Google Gemini REST API because the Apps Script deployment can call Gemini directly through `UrlFetchApp` and the user planned to use a Gemini API key.
- Stored the Gemini key in Script Properties as `GEMINI_API_KEY` and made `GEMINI_MODEL` optional.
- Set the default model to `gemini-3.1-flash-lite` per the user request.
- Added `responseMimeType: "application/json"` and parsed Gemini output from `candidates[0].content.parts[0].text`.
- Hardened the classifier prompt against prompt injection by stating that email subject/body are untrusted data and that the model must classify only according to our rules.
- Clarified that outside-service-area inquiries are still `service_request`; the deterministic resolver, not Gemini, decides whether to reject them.
- Fixed an early inbox-processing issue where self-sent detection could skip valid inbound messages. The final check only treats messages as self-sent when the sender matches the active user.
- Decided that `dry_run` should avoid Gmail write actions, including processed-label writes. This makes dry runs repeatable, but repeated dry runs can reprocess the same inbox threads.
- Added Google Sheets audit logging with run-level metadata so each `processInbox()` call can be filtered by `run_id`.
- Added raw email body, cleaned body, Gemini raw response, normalized Gemini JSON, evidence, confidence, and uncertainty reason to the audit log so classification mistakes can be explained later.

## 2026-07-16

- Reviewed the assessment PDF and confirmed the core requested pipeline is `read inbox -> classify service request -> determine Oakville -> reply accept/reject`.
- Made the GitHub repository public after scanning the repo for obvious API keys or secrets.
- Improved the service-location resolver to be conservative about ambiguous locations, conflicting cities, postal codes, street addresses, intersections, Oakville aliases, and Oakville neighborhoods.
- Removed broad location normalization that could corrupt text such as `service on Bronte Road in Oakville`.
- Avoided geocoding or external address APIs to keep the MVP small, deterministic, and free-tier friendly.
- Treated explicit outside cities such as Burlington, Mississauga, Toronto, Milton, Hamilton, Brampton, Ajax, and Georgetown as outside Oakville.
- Treated known Oakville neighborhoods such as Bronte, Glen Abbey, River Oaks, Old Oakville, West Oak Trails, and others as Oakville.
- Added tests for edge cases including `Oakville ON L6H 2R3`, `123 Main Street, Burlington, ON`, `Trafalgar and Dundas`, `Toronto Street, Oakville`, `Oakvile`, and ambiguous phrases like `maybe in Oakville`.
- Chose manual review for conflicting or unverified locations rather than pretending to know. This is slightly more conservative than the simplest assessment requirement, but safer for a real inbox.
- Kept missing-location service requests as clarification instead of rejection because the service location has not been established.
- Left `TEST_SUMMARY.md` as a manual-results table to fill after running the official generator against the Gmail account.

## Known Tradeoffs

- The project is Apps Script source, not a deployed Apps Script project. Gmail authorization, Script Properties, and manual copy/paste setup are still required.
- `dry_run` is intentionally safe, but it does not apply the processed label, so dry-run batches can be logged more than once.
- `draft` and `send` modes are implemented, but live sending should only be used after reviewing dry-run logs.
- The resolver uses deterministic text rules rather than real municipal-boundary geocoding.
- Attachments and rich HTML interpretation are out of scope for this MVP.
- The current test summary requires manual completion after official generator runs.
