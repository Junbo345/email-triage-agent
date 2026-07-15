function runLocalTests() {
  const checks = [];

  assertEqual_("normalize intent", normalizeIntent_("service_request"), INTENT_SERVICE_REQUEST);
  checks.push("normalize intent");
  assertEqual_("normalize fallback intent", normalizeIntent_("something else"), INTENT_UNCERTAIN);
  checks.push("normalize fallback intent");

  const resolvedOakville = resolveServiceLocation_({ service_location_text: "Bronte, Oakville" });
  if (!resolvedOakville.isOakville) throw new Error("Expected Bronte to resolve as Oakville");
  assertEqual_("oakville resolve", resolvedOakville.canonical, "Oakville, Ontario, Canada");
  checks.push("oakville resolve");

  const resolvedMississauga = resolveServiceLocation_({ service_location_text: "Mississauga" });
  if (resolvedMississauga.isOakville) throw new Error("Mississauga must not resolve as Oakville");
  checks.push("mississauga non-oakville");

  const resolvedUnknown = resolveServiceLocation_({ service_location_text: "" });
  assertEqual_("unknown location", resolvedUnknown.resolved, LOCATION_UNKNOWN);
  checks.push("unknown location");

  const decision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedOakville);
  if (decision.action !== "accept") throw new Error("Expected accept action");
  checks.push("accept decision");

  const clarifyDecision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedUnknown);
  assertEqual_("clarify decision", clarifyDecision.action, ACTION_CLARIFY);
  checks.push("clarify decision");

  const rejectDecision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedMississauga);
  assertEqual_("reject decision", rejectDecision.action, ACTION_REJECT);
  checks.push("reject decision");

  const nonServiceDecision = decideAction_({ intent: INTENT_NON_SERVICE, uncertainty_reason: "" }, resolvedOakville);
  assertEqual_("ignore decision", nonServiceDecision.action, ACTION_IGNORE);
  checks.push("ignore decision");

  const reply = buildReply_(
    { action: ACTION_ACCEPT, reason: "oakville" },
    { subject: "Need service", body: "please help" },
    { intent: "service_request", service_location_text: "Bronte", evidence: [] },
    resolvedOakville
  );
  if (!reply.body || reply.body.indexOf("Oakville") < 0) {
    throw new Error("Expected reply template to include Oakville reference");
  }

  return {
    passed: true,
    checks: checks,
    count: checks.length,
  };
}

function assertEqual_(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(label + " failed: expected " + expected + ", got " + actual);
  }
}
