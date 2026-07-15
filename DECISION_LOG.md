# Decision Log

## 2026-07-14

- Started from an existing workspace that contained an unrelated Python project.
- Chose to create a separate `email-triage-agent` repo scaffold rather than retrofit the existing codebase.
- Selected Google Apps Script because the assessment explicitly favors a fast Gmail prototype.
- Kept the scope intentionally small: documentation, Apps Script source layout, and local deterministic tests.
- Deferred actual Gmail/API integration until the user pastes the code into Apps Script and adds secrets manually.
