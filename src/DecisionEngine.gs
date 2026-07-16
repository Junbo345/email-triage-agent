function decideAction_(classification, location) {
  if (classification.intent === INTENT_NON_SERVICE) {
    return { action: ACTION_IGNORE, reason: "non_service_email" };
  }
  if (classification.intent === INTENT_UNCERTAIN) {
    return { action: ACTION_MANUAL_REVIEW, reason: "uncertain_intent" };
  }
  if (classification.confidence < 0.65) {
    return { action: ACTION_MANUAL_REVIEW, reason: "low_classification_confidence" };
  }
  if (location.reason === "missing_location") {
    return { action: ACTION_CLARIFY, reason: location.reason };
  }
  if (location.reason === "ambiguous_location") {
    return { action: ACTION_CLARIFY, reason: location.reason };
  }
  if (location.reason === "conflicting_locations") {
    return { action: ACTION_MANUAL_REVIEW, reason: location.reason };
  }
  if (location.isOakville) {
    if (location.reason === "oakville_match" || location.reason === "oakville_alias_match" || location.reason === "oakville_neighbourhood_match" || location.reason === "gemini_oakville_match" || location.reason === "gemini_oakville_neighbourhood_match") {
      return { action: ACTION_ACCEPT, reason: location.reason };
    }
    return { action: ACTION_MANUAL_REVIEW, reason: location.reason || "oakville_unverified" };
  }
  if (location.reason === "outside_oakville") {
    return { action: ACTION_REJECT, reason: location.reason || "outside_oakville" };
  }
  if (location.reason === "conflicting_locations" || location.reason === "unverified_location" || location.reason === "unverified_address") {
    return { action: ACTION_MANUAL_REVIEW, reason: location.reason };
  }
  if (location.reason === "low_confidence_location") {
    return { action: ACTION_MANUAL_REVIEW, reason: location.reason };
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
  return executeActionForMode_(ACTION_MODE, thread, decision, reply);
}

function executeActionForMode_(mode, thread, decision, reply, manualReviewLabel) {
  validateActionModeValue_(mode);
  if (decision.action === ACTION_IGNORE) {
    return { mode: mode, performed: false, action: decision.action, skipped: true, kind: "ignored" };
  }
  if (decision.action === ACTION_MANUAL_REVIEW) {
    if (mode !== "dry_run") {
      thread.addLabel(manualReviewLabel || getOrCreateManualReviewLabel());
    }
    return { mode: mode, performed: true, action: decision.action, kind: "queued_for_manual_review" };
  }
  if (!canCustomerReplyAction_(decision.action)) {
    throw new Error("Unsupported reply action: " + decision.action);
  }
  if (mode === "dry_run") {
    return { mode: mode, performed: false, action: decision.action, kind: "dry_run" };
  }
  if (mode === "draft") {
    thread.createDraftReply(reply.body);
    return { mode: mode, performed: true, kind: "draft", action: decision.action };
  }
  if (mode === "send") {
    thread.reply(reply.body);
    return { mode: mode, performed: true, kind: "send", action: decision.action };
  }
  throw new Error("Invalid ACTION_MODE: " + mode);
}

function canCustomerReplyAction_(action) {
  return action === ACTION_ACCEPT || action === ACTION_REJECT || action === ACTION_CLARIFY;
}

function validateActionModeValue_(mode) {
  const allowed = ["dry_run", "draft", "send"];
  if (allowed.indexOf(mode) < 0) {
    throw new Error("Invalid ACTION_MODE: " + mode);
  }
}
