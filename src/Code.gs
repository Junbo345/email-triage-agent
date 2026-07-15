function processInbox() {
  const threads = GmailApp.search(`in:inbox -label:${PROCESSED_LABEL_NAME}`, 0, MAX_THREADS_PER_RUN);
  const label = ACTION_MODE === "dry_run" ? null : getOrCreateProcessedLabel();

  threads.forEach((thread) => {
    try {
      const message = getNewestInboundMessage_(thread);
      if (!message) {
        logSkip_(thread, "no_inbound_message");
        return;
      }

      const payload = extractMessageData_(thread, message);
      if (!payload.body && !payload.subject) {
        logSkip_(thread, "empty_message");
        return;
      }

      const classification = classifyEmail_(payload);
      const location = resolveServiceLocation_(classification);
      const decision = decideAction_(classification, location);
      const reply = buildReply_(decision, payload, classification, location);
      const execution = executeAction_(thread, decision, reply);

      logProcessingResult_({ payload, classification, location, decision, execution });
      if (label) {
        thread.addLabel(label);
      }
    } catch (err) {
      logFailure_(thread, err);
    }
  });
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
  return {
    threadId: thread.getId(),
    messageId: message.getId(),
    from: message.getFrom(),
    to: message.getTo(),
    subject: message.getSubject(),
    date: message.getDate(),
    body: cleanEmailBody_(message.getPlainBody()),
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

function logSkip_(thread, reason) {
  const sheet = getOrCreateLogSheet_();
  sheet.appendRow([
    new Date(),
    thread.getId(),
    "",
    "",
    "",
    "skipped",
    "",
    reason,
    "",
    "",
    "",
    "",
    "",
    reason,
    ACTION_MODE,
    false,
    "",
    "",
  ]);
}
