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
  "location_type",
  "location_jurisdiction",
  "location_city",
  "location_province",
  "location_country",
  "location_confidence",
  "status",
];

function logProcessingStarted_(record) {
  logStatusRow_({
    runId: record.runId,
    status: "processing_started",
    payload: record.payload,
    classification: record.classification,
    location: record.location,
    decision: record.decision,
    execution: { mode: ACTION_MODE, performed: false, kind: "" },
    error: "",
  });
}

function logProcessingResult_(record) {
  logStatusRow_({
    runId: record.runId,
    status: "action_completed",
    payload: record.payload,
    classification: record.classification,
    location: record.location,
    decision: record.decision,
    execution: record.execution,
    error: "",
  });
}

function logLoggingFailed_(record) {
  logStatusRow_({
    runId: record.runId,
    status: "logging_failed",
    payload: record.payload,
    classification: record.classification,
    location: record.location,
    decision: record.decision,
    execution: record.execution,
    error: String(record.err),
  });
}

function logFailure_(thread, err, runId, payload) {
  logStatusRow_({
    runId: runId,
    status: "processing_failed",
    payload: payload || { threadId: thread.getId(), messageId: "", from: "", to: "", subject: "failure", body: "", rawBody: "" },
    classification: null,
    location: null,
    decision: { action: "", reason: "" },
    execution: { mode: ACTION_MODE, performed: false, kind: "" },
    error: String(err),
  });
}

function logStatusRow_(record) {
  const sheet = getOrCreateLogSheet_();
  const payload = record.payload || {};
  const classification = record.classification || {};
  const location = record.location || {};
  const decision = record.decision || {};
  const execution = record.execution || {};

  sheet.appendRow([
    new Date(),
    payload.threadId || "",
    payload.messageId || "",
    payload.from || "",
    payload.to || "",
    payload.subject || "",
    classification.intent || "",
    classification.service_location_text || "",
    location.resolved || "",
    location.canonical || "",
    location.isOakville === true ? true : location.isOakville === false ? false : "",
    location.reason || "",
    decision.action || "",
    decision.reason || "",
    execution.mode || ACTION_MODE,
    execution.performed === true ? true : execution.performed === false ? false : "",
    execution.kind || "",
    record.error || "",
    record.runId || "",
    payload.rawBody || "",
    payload.body || "",
    serializeForLog_(classification.evidence),
    classification.confidence == null ? "" : classification.confidence,
    classification.uncertainty_reason || "",
    classification.gemini_raw_response || "",
    serializeForLog_(classification),
    classification.location_type || "",
    classification.location_jurisdiction || "",
    classification.location_city || "",
    classification.location_province || "",
    classification.location_country || "",
    classification.location_confidence == null ? "" : classification.location_confidence,
    record.status || "",
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
