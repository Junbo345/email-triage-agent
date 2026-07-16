function runLocalTests() {
  const checks = [];

  assertEqual_("normalize intent", normalizeIntent_("service_request"), INTENT_SERVICE_REQUEST);
  checks.push("normalize intent");
  assertEqual_("normalize fallback intent", normalizeIntent_("something else"), INTENT_UNCERTAIN);
  checks.push("normalize fallback intent");

  const resolvedOakville = resolveServiceLocation_({ service_location_text: "Oakville" });
  if (!resolvedOakville.isOakville) throw new Error("Expected Oakville to resolve as Oakville");
  assertEqual_("oakville resolve", resolvedOakville.reason, "oakville_match");
  checks.push("oakville resolve");

  const resolvedOakvilleOn = resolveServiceLocation_({ service_location_text: "Oakville, ON" });
  assertEqual_("oakville on", resolvedOakvilleOn.reason, "oakville_match");
  checks.push("oakville on");

  const resolvedOakvillePostal = resolveServiceLocation_({ service_location_text: "Oakville ON L6H 2R3" });
  assertEqual_("oakville postal", resolvedOakvillePostal.reason, "oakville_match");
  checks.push("oakville postal");

  const resolvedOakvilleAddress = resolveServiceLocation_({ service_location_text: "123 Lakeshore Rd W, Oakville, ON" });
  assertEqual_("oakville address", resolvedOakvilleAddress.reason, "oakville_match");
  checks.push("oakville address");

  const resolvedServiceOnOakville = resolveServiceLocation_({ service_location_text: "service on Bronte Road in Oakville" });
  assertEqual_("service on oakville", resolvedServiceOnOakville.reason, "oakville_match");
  checks.push("service on oakville");

  const resolvedGlenAbbey = resolveServiceLocation_({ service_location_text: "Glen Abbey" });
  assertEqual_("glen abbey", resolvedGlenAbbey.reason, "oakville_neighbourhood_match");
  checks.push("glen abbey");

  const resolvedRiverOaks = resolveServiceLocation_({ service_location_text: "River Oaks" });
  assertEqual_("river oaks", resolvedRiverOaks.reason, "oakville_neighbourhood_match");
  checks.push("river oaks");

  const resolvedMississauga = resolveServiceLocation_({ service_location_text: "Mississauga" });
  if (resolvedMississauga.isOakville) throw new Error("Mississauga must not resolve as Oakville");
  assertEqual_("mississauga reason", resolvedMississauga.reason, "outside_oakville");
  checks.push("mississauga non-oakville");

  const resolvedBurlingtonCity = resolveServiceLocation_({ service_location_text: "123 Main Street, Burlington, ON" });
  assertEqual_("burlington city", resolvedBurlingtonCity.reason, "outside_oakville");
  checks.push("burlington city");

  const resolvedBurlingtonPostal = resolveServiceLocation_({ service_location_text: "Burlington, ON L7L 1A1" });
  assertEqual_("burlington postal", resolvedBurlingtonPostal.reason, "outside_oakville");
  checks.push("burlington postal");

  const resolvedBurlingtonConflict = resolveServiceLocation_({ service_location_text: "The service property is in Burlington, but our office is in Oakville" });
  if (resolvedBurlingtonConflict.reason !== "outside_oakville" && resolvedBurlingtonConflict.reason !== "conflicting_locations") {
    throw new Error("burlington conflict should be outside_oakville or conflicting_locations");
  }
  checks.push("burlington conflict");

  const resolvedTorontoConflict = resolveServiceLocation_({ service_location_text: "I live in Toronto, but the job is in Oakville" });
  assertEqual_("toronto conflict", resolvedTorontoConflict.reason, "conflicting_locations");
  checks.push("toronto conflict");

  const resolvedNotInOakville = resolveServiceLocation_({ service_location_text: "The job is not in Oakville; it is in Burlington." });
  assertEqual_("not in oakville", resolvedNotInOakville.reason, "conflicting_locations");
  checks.push("not in oakville");

  const resolvedOakvilleOrMilton = resolveServiceLocation_({ service_location_text: "Oakville or Milton, depending on availability" });
  assertEqual_("oakville or milton", resolvedOakvilleOrMilton.reason, "conflicting_locations");
  checks.push("oakville or milton");

  const resolvedOakvilleToronto = resolveServiceLocation_({ service_location_text: "Oakville / Toronto" });
  assertEqual_("oakville toronto", resolvedOakvilleToronto.reason, "conflicting_locations");
  checks.push("oakville toronto");

  const resolvedMaybeInOakville = resolveServiceLocation_({ service_location_text: "maybe in Oakville" });
  assertEqual_("maybe in oakville", resolvedMaybeInOakville.reason, "ambiguous_location");
  checks.push("maybe in oakville");

  const resolvedPossiblyOakville = resolveServiceLocation_({ service_location_text: "possibly Oakville" });
  assertEqual_("possibly oakville", resolvedPossiblyOakville.reason, "ambiguous_location");
  checks.push("possibly oakville");

  const resolvedIThinkOakville = resolveServiceLocation_({ service_location_text: "I think it is Oakville" });
  assertEqual_("i think oakville", resolvedIThinkOakville.reason, "ambiguous_location");
  checks.push("i think oakville");

  const resolvedNotSure = resolveServiceLocation_({ service_location_text: "not sure if it is Oakville" });
  assertEqual_("not sure oakville", resolvedNotSure.reason, "ambiguous_location");
  checks.push("not sure oakville");

  const resolvedAddress = resolveServiceLocation_({ service_location_text: "123 Lakeshore Rd W" });
  assertEqual_("address", resolvedAddress.reason, "unverified_address");
  checks.push("address");

  const resolvedFalseAddress1 = resolveServiceLocation_({ service_location_text: "2026 project" });
  assertEqual_("false address 1", resolvedFalseAddress1.reason, "unverified_location");
  checks.push("false address 1");

  const resolvedFalseAddress2 = resolveServiceLocation_({ service_location_text: "123 service" });
  assertEqual_("false address 2", resolvedFalseAddress2.reason, "unverified_location");
  checks.push("false address 2");

  const resolvedFalseAddress3 = resolveServiceLocation_({ service_location_text: "12 building" });
  assertEqual_("false address 3", resolvedFalseAddress3.reason, "unverified_location");
  checks.push("false address 3");

  const resolvedPostal = resolveServiceLocation_({ service_location_text: "L6H 2R3" });
  assertEqual_("postal", resolvedPostal.reason, "unverified_address");
  checks.push("postal");

  const resolvedIntersection = resolveServiceLocation_({ service_location_text: "Trafalgar and Dundas" });
  assertEqual_("intersection", resolvedIntersection.reason, "unverified_address");
  checks.push("intersection");

  const resolvedNear = resolveServiceLocation_({ service_location_text: "Sixth Line near Upper Middle Road" });
  assertEqual_("near", resolvedNear.reason, "unverified_address");
  checks.push("near");

  const resolvedRoadNear = resolveServiceLocation_({ service_location_text: "123 Lakeshore Road near Kerr Street" });
  assertEqual_("road near", resolvedRoadNear.reason, "unverified_address");
  checks.push("road near");

  const resolvedBronteNear = resolveServiceLocation_({ service_location_text: "near Bronte Village" });
  assertEqual_("bronte near", resolvedBronteNear.reason, "oakville_neighbourhood_match");
  checks.push("bronte near");

  const resolvedAmbiguous = resolveServiceLocation_({ service_location_text: "somewhere nearby" });
  assertEqual_("somewhere nearby", resolvedAmbiguous.reason, "ambiguous_location");
  checks.push("somewhere nearby");

  const resolvedMaybeOakville = resolveServiceLocation_({ service_location_text: "maybe Oakville" });
  if (resolvedMaybeOakville.reason !== "ambiguous_location" && resolvedMaybeOakville.reason !== "conflicting_locations") {
    throw new Error("maybe Oakville should not be accepted");
  }
  checks.push("maybe oakville");

  const resolvedOakvile = resolveServiceLocation_({ service_location_text: "Oakvile" });
  assertEqual_("oakvile alias", resolvedOakvile.reason, "oakville_alias_match");
  if (resolvedOakvile.confidence >= 1) throw new Error("Oakvile alias must not receive confidence 1");
  checks.push("oakvile alias");

  const resolvedWaterloo = resolveServiceLocation_({ service_location_text: "Waterloo" });
  assertEqual_("waterloo", resolvedWaterloo.reason, "unverified_location");
  checks.push("waterloo");

  const resolvedTorontoStreet = resolveServiceLocation_({ service_location_text: "Toronto Street, Oakville" });
  assertEqual_("toronto street oakville", resolvedTorontoStreet.reason, "oakville_match");
  checks.push("toronto street oakville");

  const resolvedServiceOn = resolveServiceLocation_({ service_location_text: "service on Bronte Road in Oakville" });
  assertEqual_("service on bronte road", resolvedServiceOn.reason, "oakville_match");
  checks.push("service on bronte road");

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

  const conflictDecision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedOakvilleOrMilton);
  assertEqual_("conflict decision", conflictDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("conflict decision");

  const unverifiedAddressDecision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedAddress);
  assertEqual_("unverified address decision", unverifiedAddressDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("unverified address decision");

  const unverifiedLocationDecision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedWaterloo);
  assertEqual_("unverified location decision", unverifiedLocationDecision.action, ACTION_MANUAL_REVIEW);
  checks.push("unverified location decision");

  const aliasDecision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedOakvile);
  if (aliasDecision.action === ACTION_REJECT) throw new Error("Oakville alias must never be rejected");
  checks.push("alias decision");

  const neighborhoodDecision = decideAction_({ intent: "service_request", uncertainty_reason: "" }, resolvedGlenAbbey);
  if (neighborhoodDecision.action === ACTION_REJECT) throw new Error("Oakville neighbourhood must never be rejected");
  checks.push("neighborhood decision");

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
