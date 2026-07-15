function decideAction_(classification, location) {
  if (classification.intent === INTENT_NON_SERVICE) {
    return { action: ACTION_IGNORE, reason: "non_service_email" };
  }
  if (classification.intent === INTENT_UNCERTAIN || classification.uncertainty_reason) {
    return { action: ACTION_MANUAL_REVIEW, reason: "uncertain_intent" };
  }
  if (location.resolved === LOCATION_UNKNOWN) {
    return { action: ACTION_CLARIFY, reason: location.reason || "missing_location" };
  }
  if (location.isOakville) {
    return { action: ACTION_ACCEPT, reason: location.reason || "oakville" };
  }
  if (location.reason === "outside_oakville" || location.confidence >= 0.7) {
    return { action: ACTION_REJECT, reason: location.reason || "outside_oakville" };
  }
  return { action: ACTION_MANUAL_REVIEW, reason: "low_confidence_location" };
}

function buildReply_(decision, payload, classification, location) {
  const template = getReplyTemplate_(decision.action);
  return {
    subject: template.subject,
    body: fillReplyTemplate_(template.body, payload, classification, location, decision),
  };
}

function executeAction_(thread, decision, reply) {
  if (ACTION_MODE === "dry_run") {
    return { mode: ACTION_MODE, performed: false, action: decision.action };
  }
  if (ACTION_MODE === "draft") {
    if (decision.action === ACTION_IGNORE) {
      return { mode: ACTION_MODE, performed: false, action: decision.action, skipped: true };
    }
    thread.createDraftReply(reply.body);
    return { mode: ACTION_MODE, performed: true, kind: "draft", action: decision.action };
  }
  if (decision.action === ACTION_IGNORE) {
    return { mode: ACTION_MODE, performed: false, action: decision.action, skipped: true };
  }
  thread.reply(reply.body);
  return { mode: ACTION_MODE, performed: true, kind: "send", action: decision.action };
}
