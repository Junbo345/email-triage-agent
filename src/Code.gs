function processInbox() {
  validateActionMode_();
  const runId = createRunId_();
  const threads = GmailApp.search("in:inbox", 0, MAX_THREADS_PER_RUN);
  const processedLabel = ACTION_MODE === "dry_run" ? null : getOrCreateProcessedLabel();

  threads.forEach((thread) => {
    let payload = null;
    try {
      const message = getNewestUnprocessedInboundMessage_(thread);
      if (!message) {
        logSkip_(thread, "no_inbound_unprocessed_message", runId, null);
        return;
      }

      payload = extractMessageData_(thread, message);
      if (!payload.body && !payload.subject) {
        logSkip_(thread, "empty_message", runId, payload);
        return;
      }

      const classification = classifyEmail_(payload);
      const location = resolveServiceLocation_(classification);
      const decision = decideAction_(classification, location);
      const reply = buildReply_(decision, payload, classification, location);

      logProcessingStarted_({ runId, payload, classification, location, decision });
      const execution = executeAction_(thread, decision, reply);

      if (shouldMarkMessageProcessed_(ACTION_MODE)) {
        markMessageProcessed_(payload.messageId);
        if (processedLabel) {
          thread.addLabel(processedLabel);
        }
      }

      try {
        logProcessingResult_({ runId, payload, classification, location, decision, execution });
      } catch (logErr) {
        try {
          logLoggingFailed_({ runId, payload, classification, location, decision, execution, err: logErr });
        } catch (ignored) {
        }
      }
    } catch (err) {
      logFailure_(thread, err, runId, payload);
    }
  });
}

function getNewestUnprocessedInboundMessage_(thread) {
  return getNewestUnprocessedInboundMessageFromList_(thread.getMessages(), isSelfSent_, isMessageProcessed_);
}

function getNewestUnprocessedInboundMessageFromList_(messages, isSelfSentFn, isProcessedFn) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!isSelfSentFn(msg) && !isProcessedFn(msg.getId())) return msg;
  }
  return null;
}

function getNewestInboundMessage_(thread) {
  const messages = thread.getMessages();
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!isSelfSent_(msg)) return msg;
  }
  return null;
}

function isSelfSent_(message) {
  const me = Session.getActiveUser().getEmail();
  const from = (message.getFrom() || "").toLowerCase();
  return from.includes(me.toLowerCase());
}

function extractMessageData_(thread, message) {
  const plainBody = message.getPlainBody();
  return {
    threadId: thread.getId(),
    messageId: message.getId(),
    from: message.getFrom(),
    to: message.getTo(),
    subject: message.getSubject(),
    date: message.getDate(),
    body: cleanEmailBody_(plainBody),
    rawBody: plainBody,
  };
}

function cleanEmailBody_(text) {
  const normalized = (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n>[\s\S]*$/m, "")
    .replace(/On .+wrote:\n[\s\S]*$/i, "")
    .replace(/^-{2,}\s*Original Message\s*-{2,}[\s\S]*$/i, "")
    .trim();
  return normalized;
}

function getOrCreateProcessedLabel() {
  const existing = GmailApp.getUserLabels().find((label) => label.getName() === PROCESSED_LABEL_NAME);
  if (existing) return existing;
  return GmailApp.createLabel(PROCESSED_LABEL_NAME);
}

function getOrCreateManualReviewLabel() {
  const existing = GmailApp.getUserLabels().find((label) => label.getName() === MANUAL_REVIEW_LABEL_NAME);
  if (existing) return existing;
  return GmailApp.createLabel(MANUAL_REVIEW_LABEL_NAME);
}

function isMessageProcessed_(messageId) {
  if (!messageId) return false;
  return PropertiesService.getScriptProperties().getProperty(getProcessedMessagePropertyKey_(messageId)) === "true";
}

function markMessageProcessed_(messageId) {
  if (!messageId) return;
  PropertiesService.getScriptProperties().setProperty(getProcessedMessagePropertyKey_(messageId), "true");
}

function shouldMarkMessageProcessed_(mode) {
  validateActionModeValue_(mode);
  return mode === "draft" || mode === "send";
}

function getProcessedMessagePropertyKey_(messageId) {
  return "processed_message_" + String(messageId).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function logSkip_(thread, reason, runId, payload) {
  logStatusRow_({
    runId: runId,
    status: "skipped",
    payload: payload || { threadId: thread.getId(), messageId: "", from: "", to: "", subject: "skipped", body: "", rawBody: "" },
    classification: null,
    location: null,
    decision: { action: "", reason: reason },
    execution: { mode: ACTION_MODE, performed: false, kind: "" },
    error: "",
  });
}

function createRunId_() {
  return new Date().toISOString();
}
