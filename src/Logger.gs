function logProcessingResult_(record) {
  const sheet = getOrCreateLogSheet_();
  sheet.appendRow([
    new Date(),
    record.payload.threadId,
    record.payload.messageId,
    record.payload.from,
    record.payload.to,
    record.payload.subject,
    record.classification.intent,
    record.classification.service_location_text,
    record.location.resolved,
    record.location.canonical,
    record.location.isOakville,
    record.location.reason,
    record.decision.action,
    record.decision.reason,
    record.execution.mode,
    record.execution.performed,
    record.execution.kind || "",
  ]);
}

function logFailure_(thread, err) {
  const sheet = getOrCreateLogSheet_();
  sheet.appendRow([new Date(), thread.getId(), "", "", "", "failure", "", "", "", "", "", "", "", "", ACTION_MODE, false, String(err)]);
}

function getOrCreateLogSheet_() {
  const files = DriveApp.getFilesByName(LOG_SHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId()).getActiveSheet();
  }
  const ss = SpreadsheetApp.create(LOG_SHEET_NAME);
  const sheet = ss.getActiveSheet();
  sheet.appendRow([
    "timestamp",
    "thread_id",
    "message_id",
    "from",
    "to",
    "subject",
    "intent",
    "location_text",
    "resolved_location",
    "canonical_location",
    "is_oakville",
    "location_reason",
    "action",
    "action_reason",
    "mode",
    "performed",
    "execution_kind",
    "error",
  ]);
  return sheet;
}
