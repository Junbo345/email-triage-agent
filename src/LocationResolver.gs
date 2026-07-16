const OAKVILLE_NEIGHBOURHOODS = [
  "bronte",
  "bronte village",
  "glen abbey",
  "uptown core",
  "old oakville",
  "river oaks",
  "west oak trails",
  "clearview",
  "college park",
  "joshua creek",
  "palermo",
  "falgarwood",
  "iroquois ridge",
  "kerr village",
  "downtown oakville",
  "oak park",
];

const EXPLICIT_NON_OAKVILLE_CITIES = [
  "mississauga",
  "burlington",
  "toronto",
  "hamilton",
  "milton",
  "georgetown",
  "ajax",
  "brampton",
];

const OAKVILLE_ALIASES = [
  "oakvill",
  "oakvile",
];

const AMBIGUITY_PATTERNS = [
  /\bmaybe\b/i,
  /\bpossibly\b/i,
  /\bprobably\b/i,
  /\bnot sure\b/i,
  /\bi think\b/i,
  /\bsomewhere\b/i,
  /\btbd\b/i,
  /\bto be determined\b/i,
  /\baround the city\b/i,
  /\bsomewhere near oakville\b/i,
  /\bmaybe in oakville\b/i,
  /\bnot sure if (?:it is|it's|is) oakville\b/i,
  /\bpossibly oakville\b/i,
  /\bprobably oakville\b/i,
  /\bnearby\b/i,
];

const STREET_SUFFIXES = [
  "road",
  "rd",
  "street",
  "st",
  "avenue",
  "ave",
  "drive",
  "dr",
  "boulevard",
  "blvd",
  "lane",
  "ln",
  "line",
  "parkway",
  "pkwy",
  "court",
  "ct",
  "crescent",
  "cres",
  "way",
];

function resolveServiceLocation_(classification) {
  const raw = normalizeString_(classification.service_location_text || classification.location_text || "");
  const normalized = normalizeLocationText_(raw);
  const locationType = normalizeLocationType_(classification.location_type);
  const locationJurisdiction = normalizeLocationJurisdiction_(classification.location_jurisdiction);
  const locationConfidence = clampNumber_(classification.location_confidence, 0, 1, 0);

  if (locationType === LOCATION_TYPE_CONFLICTING) {
    return {
      resolved: raw || LOCATION_UNKNOWN,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0.2,
      reason: "conflicting_locations",
    };
  }

  if (!raw) {
    return {
      resolved: LOCATION_UNKNOWN,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0,
      reason: "missing_location",
    };
  }

  if (hasConflictingCityReferences_(normalized)) {
    return {
      resolved: raw,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0.2,
      reason: "conflicting_locations",
    };
  }

  if (isAmbiguousLocation_(normalized) || locationType === LOCATION_TYPE_VAGUE_AREA) {
    return {
      resolved: raw,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0.3,
      reason: "ambiguous_location",
    };
  }

  const oakvilleNegated = isNegatedCityReference_(normalized, "oakville");
  const nonOakvilleNegated = hasAnyNegatedNonOakvilleCity_(normalized);

  const explicitOakvilleMatch = getExplicitOakvilleCityMatch_(raw, normalized);
  const explicitOakvilleNeighbourhoodMatch = getExplicitOakvilleNeighbourhoodMatch_(raw, normalized);
  const explicitNonOakvilleMatch = getExplicitNonOakvilleMatch_(raw, normalized);

  if ((oakvilleNegated || nonOakvilleNegated) && (explicitOakvilleMatch || explicitOakvilleNeighbourhoodMatch || explicitNonOakvilleMatch)) {
    return {
      resolved: raw,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0.2,
      reason: "conflicting_locations",
    };
  }

  if ((explicitOakvilleMatch || explicitOakvilleNeighbourhoodMatch) && explicitNonOakvilleMatch) {
    return {
      resolved: raw,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0.2,
      reason: "conflicting_locations",
    };
  }

  if (explicitOakvilleMatch) {
    return explicitOakvilleMatch;
  }

  if (explicitOakvilleNeighbourhoodMatch) {
    return explicitOakvilleNeighbourhoodMatch;
  }

  if (explicitNonOakvilleMatch) {
    return explicitNonOakvilleMatch;
  }

  if (isHighConfidenceOutsideCityOrMunicipality_(classification)) {
    return {
      resolved: raw,
      canonical: buildJurisdictionCanonical_(classification) || raw,
      isOakville: false,
      confidence: locationConfidence,
      reason: "outside_oakville",
    };
  }

  if (isHighConfidenceOakvilleLocation_(classification)) {
    return {
      resolved: raw,
      canonical: "Oakville, Ontario, Canada",
      isOakville: true,
      confidence: locationConfidence,
      reason: locationType === LOCATION_TYPE_OAKVILLE_NEIGHBOURHOOD ? "gemini_oakville_neighbourhood_match" : "gemini_oakville_match",
    };
  }

  if (looksLikeCanadianPostalCode_(normalized) || looksLikeStreetAddress_(normalized) || looksLikeIntersection_(normalized)) {
    return {
      resolved: raw,
      canonical: raw,
      isOakville: false,
      confidence: 0.4,
      reason: "unverified_address",
    };
  }

  if (locationJurisdiction !== LOCATION_JURISDICTION_UNKNOWN && locationConfidence < 0.8) {
    return {
      resolved: raw,
      canonical: raw,
      isOakville: false,
      confidence: locationConfidence,
      reason: "low_confidence_location",
    };
  }

  return {
    resolved: raw,
    canonical: raw,
    isOakville: false,
    confidence: 0.4,
    reason: "unverified_location",
  };
}

function normalizeLocationText_(text) {
  return String(text == null ? "" : text)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b([a-z]\d[a-z])\s?(\d[a-z]\d)\b/g, "$1 $2")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsNormalizedTerm_(text, term) {
  if (!term) return false;
  const normalizedTerm = normalizeLocationText_(term);
  if (!normalizedTerm) return false;
  const pattern = new RegExp("(?:^|\\s)" + escapeRegex_(normalizedTerm).replace(/\s+/g, "\\s+") + "(?:$|\\s)");
  return pattern.test(text);
}

function containsAnyNormalizedTerm_(text, terms) {
  for (let i = 0; i < terms.length; i += 1) {
    if (containsNormalizedTerm_(text, terms[i])) {
      return true;
    }
  }
  return false;
}

function getExplicitOakvilleCityMatch_(raw, normalized) {
  if (isNegatedCityReference_(normalized, "oakville") && !containsAnyNormalizedTerm_(normalized, EXPLICIT_NON_OAKVILLE_CITIES)) {
    return null;
  }

  if (containsAnyNormalizedTerm_(normalized, ["oakville"])) {
    return {
      resolved: raw,
      canonical: "Oakville, Ontario, Canada",
      isOakville: true,
      confidence: 1,
      reason: "oakville_match",
    };
  }

  if (containsAnyNormalizedTerm_(normalized, OAKVILLE_ALIASES)) {
    return {
      resolved: raw,
      canonical: "Oakville, Ontario, Canada",
      isOakville: true,
      confidence: 0.8,
      reason: "oakville_alias_match",
    };
  }

  return null;
}

function getExplicitOakvilleNeighbourhoodMatch_(raw, normalized) {
  const neighbourhood = getValidOakvilleNeighbourhood_(normalized);
  if (neighbourhood) {
    return {
      resolved: raw,
      canonical: "Oakville, Ontario, Canada",
      isOakville: true,
      confidence: 0.9,
      reason: "oakville_neighbourhood_match",
    };
  }
  return null;
}

function getValidOakvilleNeighbourhood_(normalized) {
  for (let i = 0; i < OAKVILLE_NEIGHBOURHOODS.length; i += 1) {
    const neighbourhood = OAKVILLE_NEIGHBOURHOODS[i];
    if (!containsNormalizedTerm_(normalized, neighbourhood)) {
      continue;
    }
    if (looksLikeStreetNameTerm_(normalized, neighbourhood)) {
      continue;
    }
    if (isWholeLocationTerm_(normalized, neighbourhood) || hasOakvilleContext_(normalized) || hasNeighbourhoodContext_(normalized, neighbourhood)) {
      return neighbourhood;
    }
  }
  return "";
}

function hasOakvilleContext_(normalized) {
  return containsNormalizedTerm_(normalized, "oakville");
}

function hasNeighbourhoodContext_(normalized, neighbourhood) {
  const term = escapeRegex_(normalizeLocationText_(neighbourhood)).replace(/\s+/g, "\\s+");
  const patterns = [
    new RegExp("\\bin\\s+" + term + "\\b", "i"),
    new RegExp("\\blocated\\s+in\\s+" + term + "\\b", "i"),
    new RegExp("\\bproperty\\s+in\\s+" + term + "\\b", "i"),
    new RegExp("\\bhome\\s+in\\s+" + term + "\\b", "i"),
    new RegExp("\\bhouse\\s+in\\s+" + term + "\\b", "i"),
    new RegExp("\\bsite\\s+in\\s+" + term + "\\b", "i"),
    new RegExp("\\bmay\\s+be\\s+(?:in\\s+)?" + term + "\\b", "i"),
    new RegExp("\\bcould\\s+be\\s+(?:in\\s+)?" + term + "\\b", "i"),
    new RegExp("\\bmight\\s+be\\s+(?:in\\s+)?" + term + "\\b", "i"),
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    if (patterns[i].test(normalized)) {
      return true;
    }
  }
  return false;
}

function isWholeLocationTerm_(normalized, term) {
  return normalized === normalizeLocationText_(term);
}

function isHighConfidenceOutsideCityOrMunicipality_(classification) {
  const locationType = normalizeLocationType_(classification.location_type);
  const jurisdiction = normalizeLocationJurisdiction_(classification.location_jurisdiction);
  const confidence = clampNumber_(classification.location_confidence, 0, 1, 0);
  return jurisdiction === LOCATION_JURISDICTION_OUTSIDE_OAKVILLE &&
    confidence >= 0.8 &&
    (locationType === LOCATION_TYPE_CITY || locationType === LOCATION_TYPE_MUNICIPALITY);
}

function isHighConfidenceOakvilleLocation_(classification) {
  const locationType = normalizeLocationType_(classification.location_type);
  const jurisdiction = normalizeLocationJurisdiction_(classification.location_jurisdiction);
  const confidence = clampNumber_(classification.location_confidence, 0, 1, 0);
  const normalized = normalizeLocationText_(classification.service_location_text || classification.location_text || "");
  if (jurisdiction !== LOCATION_JURISDICTION_OAKVILLE || confidence < 0.8) {
    return false;
  }
  if (locationType === LOCATION_TYPE_CITY || locationType === LOCATION_TYPE_MUNICIPALITY) {
    return true;
  }
  return locationType === LOCATION_TYPE_OAKVILLE_NEIGHBOURHOOD && confidence >= 0.85 && !containsStreetNamedOakvilleNeighbourhood_(normalized);
}

function buildJurisdictionCanonical_(classification) {
  const parts = [
    normalizeString_(classification.location_city || ""),
    normalizeString_(classification.location_province || ""),
    normalizeString_(classification.location_country || ""),
  ].filter(function (part) {
    return Boolean(part);
  });
  return parts.join(", ");
}

function containsStreetNamedOakvilleNeighbourhood_(normalized) {
  for (let i = 0; i < OAKVILLE_NEIGHBOURHOODS.length; i += 1) {
    if (looksLikeStreetNameTerm_(normalized, OAKVILLE_NEIGHBOURHOODS[i])) {
      return true;
    }
  }
  return false;
}

function getExplicitNonOakvilleMatch_(raw, normalized) {
  const cities = getExplicitNonOakvilleCities_(normalized);
  if (cities.length === 0) {
    return null;
  }

  if (hasConflictingCityReferences_(normalized)) {
    return {
      resolved: raw,
      canonical: LOCATION_UNKNOWN,
      isOakville: false,
      confidence: 0.2,
      reason: "conflicting_locations",
    };
  }

  if (cities.length === 1) {
    return {
      resolved: raw,
      canonical: raw,
      isOakville: false,
      confidence: 1,
      reason: "outside_oakville",
    };
  }

  return {
    resolved: raw,
    canonical: LOCATION_UNKNOWN,
    isOakville: false,
    confidence: 0.2,
    reason: "conflicting_locations",
  };
}

function getExplicitNonOakvilleCities_(text) {
  const matches = [];
  for (let i = 0; i < EXPLICIT_NON_OAKVILLE_CITIES.length; i += 1) {
    const city = EXPLICIT_NON_OAKVILLE_CITIES[i];
    if (containsNormalizedTerm_(text, city) && !looksLikeStreetNameTerm_(text, city) && !isNegatedCityReference_(text, city)) {
      matches.push(city);
    }
  }
  return matches;
}

function isAmbiguousLocation_(normalized) {
  for (let i = 0; i < AMBIGUITY_PATTERNS.length; i += 1) {
    if (AMBIGUITY_PATTERNS[i].test(normalized)) {
      return true;
    }
  }
  return false;
}

function hasConflictingCityReferences_(text) {
  const explicitOakvilleMention = containsAnyNormalizedTerm_(text, ["oakville"]) || containsAnyNormalizedTerm_(text, OAKVILLE_ALIASES);
  const validOakvilleNeighbourhood = Boolean(getValidOakvilleNeighbourhood_(text));
  const oakvilleMentioned = explicitOakvilleMention || validOakvilleNeighbourhood;
  const otherCities = getExplicitNonOakvilleCities_(text);
  return oakvilleMentioned && otherCities.length > 0;
}

function isNegatedCityReference_(text, term) {
  const normalizedTerm = normalizeLocationText_(term);
  const negationPatterns = [
    new RegExp("\\bnot\\s+(?:(?:in|at)\\s+)?" + escapeRegex_(normalizedTerm) + "\\b", "i"),
    new RegExp("\\b(?:isn't|is not|aren't|are not|wasn't|was not|weren't|were not)\\s+" + escapeRegex_(normalizedTerm) + "\\b", "i"),
    new RegExp("\\bno\\s+" + escapeRegex_(normalizedTerm) + "\\b", "i"),
  ];
  for (let i = 0; i < negationPatterns.length; i += 1) {
    if (negationPatterns[i].test(text)) {
      return true;
    }
  }
  return false;
}

function hasAnyNegatedNonOakvilleCity_(text) {
  for (let i = 0; i < EXPLICIT_NON_OAKVILLE_CITIES.length; i += 1) {
    if (isNegatedCityReference_(text, EXPLICIT_NON_OAKVILLE_CITIES[i])) {
      return true;
    }
  }
  return false;
}

function looksLikeCanadianPostalCode_(text) {
  return /\b[abceghj-nprstvxy]\d[abceghj-nprstv-z]\s?\d[abceghj-nprstv-z]\d\b/i.test(text);
}

function looksLikeStreetAddress_(text) {
  var addressPattern = /\b\d{1,5}\s+[a-z0-9]+(?:\s+[a-z0-9]+){0,4}\s+(?:rd|road|street|st|ave|avenue|dr|drive|blvd|boulevard|ln|lane|line|pkwy|parkway|ct|court|cres|crescent|way)\b/i;
  if (addressPattern.test(text)) {
    return true;
  }
  return /\b(?:unit|apt|suite|ste|#)\s*\d+/i.test(text) && /\b\d{1,5}\s+[a-z0-9]+/i.test(text);
}

function looksLikeIntersection_(text) {
  const roadLike = "(?:[a-z0-9]+(?:\\s+[a-z0-9]+){0,3}\\s+(?:" + STREET_SUFFIXES.join("|") + ")|(?:[a-z]+\\s+)?line|upper middle road|dundas street|trafalgar road|lakeshore road)";
  const pattern = new RegExp("\\b(" + roadLike + ")\\b\\s*(?:and|&)\\s*\\b(" + roadLike + ")\\b", "i");
  if (pattern.test(text)) {
    return true;
  }

  const nearPattern = new RegExp("\\b(" + roadLike + ")\\b\\s+near\\b\\s+(" + roadLike + ")\\b", "i");
  if (nearPattern.test(text)) {
    return true;
  }

  const parts = text.split(/\b(?:and|&|near)\b/);
  if (parts.length < 2) {
    return false;
  }

  const left = normalizeIntersectionSide_(parts[0]);
  const right = normalizeIntersectionSide_(parts[1]);
  if (!left || !right) {
    return false;
  }
  if (isOnlyCityName_(left) || isOnlyCityName_(right)) {
    return false;
  }
  return looksLikeRoadLikeToken_(left) && looksLikeRoadLikeToken_(right);
}

function normalizeIntersectionSide_(text) {
  return String(text == null ? "" : text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeRoadLikeToken_(text) {
  if (/\b\d{1,5}\b/.test(text)) {
    return true;
  }
  if (new RegExp("\\b(?:" + STREET_SUFFIXES.join("|") + ")\\b", "i").test(text)) {
    return true;
  }
  return /\b(?:trafalgar|dundas|lakeshore|sheridan|speers|upper|middle|sixth|third|fourth|fifth|seventh|eighth|ninth|tenth|bronte)\b/i.test(text);
}

function isOnlyCityName_(text) {
  const normalized = normalizeLocationText_(text);
  return normalized === "oakville" || EXPLICIT_NON_OAKVILLE_CITIES.indexOf(normalized) >= 0 || OAKVILLE_ALIASES.indexOf(normalized) >= 0 || OAKVILLE_NEIGHBOURHOODS.indexOf(normalized) >= 0;
}

function looksLikeStreetNameTerm_(text, term) {
  const normalizedTerm = normalizeLocationText_(term);
  const escapedTerm = escapeRegex_(normalizedTerm);
  const suffixes = STREET_SUFFIXES.join("|");
  const streetSuffixPattern = new RegExp("\\b" + escapedTerm + "\\b\\s+(?:" + suffixes + ")\\b", "i");
  return streetSuffixPattern.test(text);
}

function escapeRegex_(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
