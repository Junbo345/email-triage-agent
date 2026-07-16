const LOG_HEADERS = [
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
  "run_id",
  "email_body",
  "cleaned_body",
  "gemini_evidence",
  "gemini_confidence",
  "gemini_uncertainty_reason",
  "gemini_raw_response",
  "gemini_normalized_json",
];

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
    "",
    record.runId,
    record.payload.rawBody || "",
    record.payload.body || "",
    serializeForLog_(record.classification.evidence),
    record.classification.confidence,
    record.classification.uncertainty_reason,
    record.classification.gemini_raw_response || "",
    serializeForLog_(record.classification),
  ]);
}

function logFailure_(thread, err, runId, payload) {
  const sheet = getOrCreateLogSheet_();
  sheet.appendRow([
    new Date(),
    thread.getId(),
    payload && payload.messageId ? payload.messageId : "",
    payload && payload.from ? payload.from : "",
    payload && payload.to ? payload.to : "",
    payload && payload.subject ? payload.subject : "failure",
    "",
    payload && payload.body ? payload.body : "",
    "",
    "",
    "",
    "",
    "",
    "",
    ACTION_MODE,
    false,
    "",
    String(err),
    runId,
    payload && payload.rawBody ? payload.rawBody : "",
    payload && payload.body ? payload.body : "",
    "",
    "",
    "",
    "",
    "",
  ]);
}

function getOrCreateLogSheet_() {
  const files = DriveApp.getFilesByName(LOG_SHEET_NAME);
  if (files.hasNext()) {
    const sheet = SpreadsheetApp.openById(files.next().getId()).getActiveSheet();
    ensureLogSheetColumns_(sheet);
    return sheet;
  }
  const ss = SpreadsheetApp.create(LOG_SHEET_NAME);
  const sheet = ss.getActiveSheet();
  sheet.appendRow(LOG_HEADERS);
  return sheet;
}

function ensureLogSheetColumns_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.appendRow(LOG_HEADERS);
    return;
  }

  const headerValues = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const missingHeaders = [];
  for (let i = 0; i < LOG_HEADERS.length; i += 1) {
    if (headerValues.indexOf(LOG_HEADERS[i]) < 0) {
      missingHeaders.push(LOG_HEADERS[i]);
    }
  }

  if (missingHeaders.length > 0) {
    sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }
}

function serializeForLog_(value) {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (err) {
    return String(value);
  }
}
