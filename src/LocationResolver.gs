function resolveServiceLocation_(classification) {
  const raw = normalizeString_(classification.service_location_text || classification.location_text || "");
  if (!raw) {
    return {
      resolved: LOCATION_UNKNOWN,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0,
      reason: "missing_location",
    };
  }

  const normalized = raw.toLowerCase();
  if (isOakvilleLocationText_(normalized)) {
    return {
      resolved: raw,
      canonical: "Oakville, Ontario, Canada",
      isOakville: true,
      confidence: 1,
      reason: "oakville_match",
    };
  }

  if (isExplicitNonOakville_(normalized)) {
    return {
      resolved: raw,
      canonical: raw,
      isOakville: false,
      confidence: 1,
      reason: "outside_oakville",
    };
  }

  if (isAmbiguousLocation_(normalized)) {
    return {
      resolved: LOCATION_UNKNOWN,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0.3,
      reason: "ambiguous_location",
    };
  }

  return {
    resolved: raw,
    canonical: raw,
    isOakville: false,
    confidence: 0.7,
    reason: "non_oakville_location",
  };
}

function isOakvilleLocationText_(text) {
  return (
    text.indexOf("oakville") >= 0 ||
    text.indexOf("bronte") >= 0 ||
    text.indexOf("glen abbey") >= 0 ||
    text.indexOf("uptown core") >= 0 ||
    text.indexOf("bronte village") >= 0 ||
    text.indexOf("old oakville") >= 0
  );
}

function isExplicitNonOakville_(text) {
  return (
    text.indexOf("mississauga") >= 0 ||
    text.indexOf("burlington") >= 0 ||
    text.indexOf("toronto") >= 0 ||
    text.indexOf("hamilton") >= 0 ||
    text.indexOf("milton") >= 0 ||
    text.indexOf("georgetown") >= 0 ||
    text.indexOf("ajax") >= 0 ||
    text.indexOf("brampton") >= 0
  );
}

function isAmbiguousLocation_(text) {
  return (
    text.indexOf("near") >= 0 ||
    text.indexOf("around") >= 0 ||
    text.indexOf("not sure") >= 0 ||
    text.indexOf("somewhere") >= 0 ||
    text.indexOf("maybe") >= 0 ||
    text.indexOf("tbd") >= 0 ||
    text.indexOf("to be determined") >= 0 ||
    text.indexOf("city") >= 0 && text.length < 10
  );
}
