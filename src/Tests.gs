function runLocalTests() {
  const checks = [];

  assertEqual_("normalize intent", normalizeIntent_("service_request"), INTENT_SERVICE_REQUEST);
  checks.push("normalize intent");
  assertEqual_("normalize fallback intent", normalizeIntent_("something else"), INTENT_UNCERTAIN);
  checks.push("normalize fallback intent");
  assertEqual_("normalize location type fallback", normalizeLocationType_("not_real"), LOCATION_TYPE_UNKNOWN);
  checks.push("normalize location type fallback");
  assertEqual_("normalize jurisdiction fallback", normalizeLocationJurisdiction_("not_real"), LOCATION_JURISDICTION_UNKNOWN);
  checks.push("normalize jurisdiction fallback");

  const parsedClassification = validateClassification_({
    intent: "service_request",
    service_location_text: "Waterloo",
    location_type: "city",
    location_jurisdiction: "outside_oakville",
    location_city: "Waterloo",
    location_province: "Ontario",
    location_country: "Canada",
    location_confidence: 0.98,
    evidence: ["Waterloo"],
    confidence: 0.95,
    uncertainty_reason: "",
  }, { subject: "Need service", body: "Waterloo" });
  assertEqual_("classification location city", parsedClassification.location_city, "Waterloo");
  assertEqual_("classification location type", parsedClassification.location_type, LOCATION_TYPE_CITY);
  checks.push("classification new schema");

  const resolvedOakville = resolveServiceLocation_(makeClassification_("Oakville", LOCATION_TYPE_CITY, LOCATION_JURISDICTION_OAKVILLE, 0.99));
  if (!resolvedOakville.isOakville) throw new Error("Expected Oakville to resolve as Oakville");
  assertEqual_("oakville resolve", resolvedOakville.reason, "oakville_match");
  checks.push("oakville resolve");

  const resolvedOakvilleOn = resolveServiceLocation_(makeClassification_("Oakville, ON", LOCATION_TYPE_CITY, LOCATION_JURISDICTION_OAKVILLE, 0.99));
  assertEqual_("oakville on", resolvedOakvilleOn.reason, "oakville_match");
  checks.push("oakville on");

  const resolvedOakvilleAddress = resolveServiceLocation_(makeClassification_("123 Lakeshore Rd W, Oakville, ON", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_OAKVILLE, 0.9));
  assertEqual_("oakville address", resolvedOakvilleAddress.reason, "oakville_match");
  checks.push("oakville address");

  const resolvedServiceOnOakville = resolveServiceLocation_(makeClassification_("service on Bronte Road in Oakville", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_OAKVILLE, 0.9));
  assertEqual_("service on oakville", resolvedServiceOnOakville.reason, "oakville_match");
  checks.push("service on oakville");

  const resolvedBronte = resolveServiceLocation_(makeClassification_("Bronte", LOCATION_TYPE_OAKVILLE_NEIGHBOURHOOD, LOCATION_JURISDICTION_OAKVILLE, 0.9));
  assertEqual_("bronte neighborhood", resolvedBronte.reason, "oakville_neighbourhood_match");
  checks.push("bronte neighborhood");

  const resolvedBronteVillage = resolveServiceLocation_(makeClassification_("in Bronte Village", LOCATION_TYPE_OAKVILLE_NEIGHBOURHOOD, LOCATION_JURISDICTION_OAKVILLE, 0.9));
  assertEqual_("bronte village context", resolvedBronteVillage.reason, "oakville_neighbourhood_match");
  checks.push("bronte village context");

  const resolvedGlenAbbey = resolveServiceLocation_(makeClassification_("Glen Abbey", LOCATION_TYPE_OAKVILLE_NEIGHBOURHOOD, LOCATION_JURISDICTION_OAKVILLE, 0.9));
  assertEqual_("glen abbey", resolvedGlenAbbey.reason, "oakville_neighbourhood_match");
  checks.push("glen abbey");

  const resolvedBronteRoad = resolveServiceLocation_(makeClassification_("Bronte Road", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_UNKNOWN, 0.4));
  if (resolvedBronteRoad.isOakville) throw new Error("Bronte Road must not automatically resolve as Oakville");
  checks.push("bronte road non-neighborhood");

  const resolvedCollegeParkDrive = resolveServiceLocation_(makeClassification_("College Park Drive", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_UNKNOWN, 0.4));
  if (resolvedCollegeParkDrive.isOakville) throw new Error("College Park Drive must not automatically resolve as Oakville");
  checks.push("college park drive non-neighborhood");

  const resolvedOakParkBoulevard = resolveServiceLocation_(makeClassification_("Oak Park Boulevard", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_UNKNOWN, 0.4));
  if (resolvedOakParkBoulevard.isOakville) throw new Error("Oak Park Boulevard must not automatically resolve as Oakville");
  checks.push("oak park boulevard non-neighborhood");

  const resolvedTorontoStreet = resolveServiceLocation_(makeClassification_("Toronto Street, Oakville", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_OAKVILLE, 0.95));
  assertEqual_("toronto street oakville", resolvedTorontoStreet.reason, "oakville_match");
  checks.push("toronto street oakville");

  assertOutsideCityReject_("Waterloo", "Ontario", "Canada", checks);
  assertOutsideCityReject_("Ottawa", "Ontario", "Canada", checks);
  assertOutsideCityReject_("Montreal", "Quebec", "Canada", checks);
  assertOutsideCityReject_("Vancouver", "British Columbia", "Canada", checks);
  assertOutsideCityReject_("Calgary", "Alberta", "Canada", checks);
  assertOutsideCityReject_("New York", "New York", "USA", checks);

  const lowConfidenceOutside = resolveServiceLocation_({
    service_location_text: "Waterloo",
    location_type: LOCATION_TYPE_CITY,
    location_jurisdiction: LOCATION_JURISDICTION_OUTSIDE_OAKVILLE,
    location_city: "Waterloo",
    location_confidence: 0.55,
  });
  assertEqual_("low confidence outside reason", lowConfidenceOutside.reason, "low_confidence_location");
  const lowConfidenceDecision = decideAction_(makeIntentClassification_(INTENT_SERVICE_REQUEST, 0.95), lowConfidenceOutside);
  assertEqual_("low confidence outside decision", lowConfidenceDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("low confidence outside manual review");

  const resolvedMississauga = resolveServiceLocation_(makeClassification_("Mississauga", LOCATION_TYPE_CITY, LOCATION_JURISDICTION_OUTSIDE_OAKVILLE, 0.99));
  assertEqual_("mississauga reason", resolvedMississauga.reason, "outside_oakville");
  checks.push("mississauga non-oakville");

  const resolvedBurlingtonCity = resolveServiceLocation_(makeClassification_("123 Main Street, Burlington, ON", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_OUTSIDE_OAKVILLE, 0.99));
  assertEqual_("burlington city", resolvedBurlingtonCity.reason, "outside_oakville");
  checks.push("burlington city");

  const resolvedTorontoConflict = resolveServiceLocation_(makeClassification_("I live in Toronto, but the job is in Oakville", LOCATION_TYPE_CONFLICTING, LOCATION_JURISDICTION_UNKNOWN, 0.3));
  assertEqual_("toronto conflict", resolvedTorontoConflict.reason, "conflicting_locations");
  checks.push("toronto conflict");

  const resolvedOakvilleOrMilton = resolveServiceLocation_(makeClassification_("Oakville or Milton, depending on availability", LOCATION_TYPE_CONFLICTING, LOCATION_JURISDICTION_UNKNOWN, 0.3));
  assertEqual_("oakville or milton", resolvedOakvilleOrMilton.reason, "conflicting_locations");
  checks.push("oakville or milton");

  const resolvedMaybeInOakville = resolveServiceLocation_(makeClassification_("maybe in Oakville", LOCATION_TYPE_VAGUE_AREA, LOCATION_JURISDICTION_UNKNOWN, 0.3));
  assertEqual_("maybe in oakville", resolvedMaybeInOakville.reason, "ambiguous_location");
  checks.push("maybe in oakville");

  const resolvedAddress = resolveServiceLocation_(makeClassification_("123 Maple Avenue", LOCATION_TYPE_STREET_ADDRESS, LOCATION_JURISDICTION_UNKNOWN, 0.7));
  assertEqual_("address-only reason", resolvedAddress.reason, "unverified_address");
  const addressDecision = decideAction_(makeIntentClassification_(INTENT_SERVICE_REQUEST, 0.95), resolvedAddress);
  assertEqual_("address-only decision", addressDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("address-only manual review");

  const resolvedPostal = resolveServiceLocation_(makeClassification_("L6H 2R3", LOCATION_TYPE_POSTAL_CODE, LOCATION_JURISDICTION_UNKNOWN, 0.7));
  assertEqual_("postal-only reason", resolvedPostal.reason, "unverified_address");
  const postalDecision = decideAction_(makeIntentClassification_(INTENT_SERVICE_REQUEST, 0.95), resolvedPostal);
  assertEqual_("postal-only decision", postalDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("postal-only manual review");

  const resolvedIntersection = resolveServiceLocation_(makeClassification_("Trafalgar and Dundas", LOCATION_TYPE_INTERSECTION, LOCATION_JURISDICTION_UNKNOWN, 0.7));
  assertEqual_("intersection-only reason", resolvedIntersection.reason, "unverified_address");
  const intersectionDecision = decideAction_(makeIntentClassification_(INTENT_SERVICE_REQUEST, 0.95), resolvedIntersection);
  assertEqual_("intersection-only decision", intersectionDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("intersection-only manual review");

  const resolvedUnknown = resolveServiceLocation_(makeClassification_("", LOCATION_TYPE_MISSING, LOCATION_JURISDICTION_UNKNOWN, 0));
  assertEqual_("unknown location", resolvedUnknown.resolved, LOCATION_UNKNOWN);
  const clarifyDecision = decideAction_(makeIntentClassification_(INTENT_SERVICE_REQUEST, 0.95), resolvedUnknown);
  assertEqual_("clarify decision", clarifyDecision.action, ACTION_CLARIFY);
  checks.push("clarify missing location");

  const lowClassificationDecision = decideAction_(makeIntentClassification_(INTENT_SERVICE_REQUEST, 0.5), resolvedOakville);
  assertEqual_("low classification confidence", lowClassificationDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("low classification confidence");

  const nonServiceDecision = decideAction_(makeIntentClassification_(INTENT_NON_SERVICE, 0.95), resolvedOakville);
  assertEqual_("ignore decision", nonServiceDecision.action, ACTION_IGNORE);
  checks.push("ignore decision");

  const fakeLabel = { name: MANUAL_REVIEW_LABEL_NAME };
  const manualThread = makeFakeThread_();
  const manualExecution = executeActionForMode_("send", manualThread, { action: ACTION_MANUAL_REVIEW, reason: "test" }, { body: "should not send" }, fakeLabel);
  assertEqual_("manual review execution kind", manualExecution.kind, "queued_for_manual_review");
  assertEqual_("manual review sends", manualThread.sent, 0);
  assertEqual_("manual review drafts", manualThread.drafts, 0);
  assertEqual_("manual review labels", manualThread.labels, 1);
  checks.push("manual review does not reply");

  const ignoreThread = makeFakeThread_();
  const ignoreExecution = executeActionForMode_("send", ignoreThread, { action: ACTION_IGNORE, reason: "test" }, { body: "" }, fakeLabel);
  assertEqual_("ignore execution kind", ignoreExecution.kind, "ignored");
  assertEqual_("ignore sends", ignoreThread.sent, 0);
  checks.push("ignore does not send");

  const sendThread = makeFakeThread_();
  executeActionForMode_("send", sendThread, { action: ACTION_ACCEPT, reason: "test" }, { body: "accepted" }, fakeLabel);
  assertEqual_("accept send count", sendThread.sent, 1);
  checks.push("send allowed for accept");

  assertThrows_("invalid action mode", function () {
    validateActionModeValue_("oops");
  });
  checks.push("invalid action mode");

  const messages = [
    makeFakeMessage_("same-message", false),
    makeFakeMessage_("new-message", false),
  ];
  const newest = getNewestUnprocessedInboundMessageFromList_(messages, function (msg) {
    return msg.selfSent;
  }, function (messageId) {
    return messageId === "same-message";
  });
  assertEqual_("new message in same thread", newest.getId(), "new-message");
  checks.push("new message in same thread");

  const repeated = getNewestUnprocessedInboundMessageFromList_([makeFakeMessage_("same-message", false)], function (msg) {
    return msg.selfSent;
  }, function (messageId) {
    return messageId === "same-message";
  });
  assertEqual_("same message not reprocessed", repeated, null);
  checks.push("same message not reprocessed");

  const selfSent = getNewestUnprocessedInboundMessageFromList_([makeFakeMessage_("self-message", true)], function (msg) {
    return msg.selfSent;
  }, function () {
    return false;
  });
  assertEqual_("self sent ignored", selfSent, null);
  checks.push("self sent ignored");

  const reply = buildReply_(
    { action: ACTION_ACCEPT, reason: "oakville" },
    { subject: "Need service", body: "please help" },
    { intent: "service_request", service_location_text: "Bronte", evidence: [] },
    resolvedOakville
  );
  if (!reply.body || reply.body.indexOf("Oakville") < 0) {
    throw new Error("Expected reply template to include Oakville reference");
  }
  checks.push("reply template");

  return {
    passed: true,
    checks: checks,
    count: checks.length,
  };
}

function makeClassification_(text, locationType, jurisdiction, locationConfidence) {
  return {
    service_location_text: text,
    location_type: locationType,
    location_jurisdiction: jurisdiction,
    location_city: text,
    location_province: "",
    location_country: "",
    location_confidence: locationConfidence,
  };
}

function makeIntentClassification_(intent, confidence) {
  return {
    intent: intent,
    confidence: confidence,
    uncertainty_reason: "",
  };
}

function assertOutsideCityReject_(city, province, country, checks) {
  const resolved = resolveServiceLocation_({
    service_location_text: city,
    location_type: LOCATION_TYPE_CITY,
    location_jurisdiction: LOCATION_JURISDICTION_OUTSIDE_OAKVILLE,
    location_city: city,
    location_province: province,
    location_country: country,
    location_confidence: 0.98,
  });
  assertEqual_(city + " reason", resolved.reason, "outside_oakville");
  const decision = decideAction_(makeIntentClassification_(INTENT_SERVICE_REQUEST, 0.95), resolved);
  assertEqual_(city + " decision", decision.action, ACTION_REJECT);
  checks.push(city + " reject");
}

function makeFakeThread_() {
  return {
    sent: 0,
    drafts: 0,
    labels: 0,
    reply: function () {
      this.sent += 1;
    },
    createDraftReply: function () {
      this.drafts += 1;
    },
    addLabel: function () {
      this.labels += 1;
    },
  };
}

function makeFakeMessage_(id, selfSent) {
  return {
    selfSent: selfSent,
    getId: function () {
      return id;
    },
  };
}

function assertEqual_(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(label + " failed: expected " + expected + ", got " + actual);
  }
}

function assertThrows_(label, fn) {
  try {
    fn();
  } catch (err) {
    return;
  }
  throw new Error(label + " failed: expected an error");
}
