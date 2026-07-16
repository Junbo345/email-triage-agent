# Debrief Guide

## Architecture in 30 Seconds

The system follows this path:

```text
Gmail -> cleaned body -> Gemini structured extraction ->
deterministic resolver -> deterministic action ->
fixed template -> Gmail action -> audit log
```

Apps Script reads the newest unprocessed inbound Gmail message, cleans the
plain-text body, asks Gemini for structured intent and location fields, and
then uses deterministic code to decide whether the request is for Oakville,
outside Oakville, missing, ambiguous, conflicting, or unverified. Customer
replies use fixed templates only, and each run writes audit details to the
`AI Triage Log` Google Sheet.

## Why Apps Script

Apps Script was chosen because it gave the shortest path to a real Gmail
inbox, real Gmail drafts or replies, Google Sheets logging, and a source-first
prototype that can be explained in a short debrief.

Python with the Gmail API would have provided a more conventional service
architecture and easier package management, but it would also require OAuth
setup, token storage, hosting, and deployment decisions. Low-code tools such
as n8n, Zapier, or Power Automate would be quick to wire together, but the
classification, resolver, and idempotency logic would be less transparent in
source form. Microsoft Graph with a shared mailbox is likely the stronger
production direction, but Entra application setup and enterprise permissions
were too much infrastructure for the assessment prototype.

## One Failure and Root Cause

A Burlington request near Spencer Smith Park was originally sent to location
clarification even though Gemini returned `outside_oakville` with high
confidence and `location_city: "Burlington"`.

The root cause was resolver ordering: `location_type: "vague_area"` was being
treated as more important than high-confidence outside-city jurisdiction. The
fix was to resolve high-confidence outside-city evidence with a concrete city
as `outside_oakville` before falling back to vague-area clarification.

## Most Concerning Production Failure

The most concerning production failure would be sending an incorrect
acceptance or rejection to a real customer. For that reason, uncertain,
conflicting, low-confidence, and unverified locations are routed to
`manual_review` instead of being guessed.

## What Would Be Monitored

- Gemini error rate and malformed-JSON rate.
- Low-confidence and `manual_review` rate.
- Gmail send and draft failures.
- Processed-state write failures.
- Duplicate actions on the same message ID.
- Unexpected increases in accept or reject rates.
- Google Sheets logging failures.

## What I Would Do Differently

- Start with a labelled evaluation dataset earlier.
- Define expected ambiguity behavior before implementation.
- Separate mailbox integration tests from classification and resolver tests.
- Add a staff approval mode before any live unattended sending.

## Known Limitations

- The repository contains Apps Script source, not a deployed Apps Script
  project.
- Gmail authorization, Script Properties, and copy/paste setup remain manual.
- Attachments and rich HTML interpretation are out of scope.
- The resolver does not perform municipal-boundary geocoding.
- Arbitrary street addresses, postal codes, and intersections without a
  confirmed municipality are not automatically accepted or rejected.
- The final successful generator batch does not prove universal accuracy.
