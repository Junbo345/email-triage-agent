function classifyEmail(payload) {
  return classifyEmail_(payload);
}

function classifyEmail_(payload) {
  const prompt = buildClassificationPrompt_(payload);
  const responseText = callGeminiJson_(prompt);
  const parsed = parseClassificationResponse_(responseText);
  return validateClassification_(parsed, payload);
}

function buildClassificationPrompt_(payload) {
  return [
    "You are classifying inbound customer emails for a service company that only serves Oakville, Ontario, Canada.",
    "Return a single JSON object with these keys:",
    'intent: one of "service_request", "non_service", "uncertain"',
    "service_location_text: string or empty string",
    "evidence: array of 1 to 3 short quotes or paraphrases from the email",
    "confidence: number from 0 to 1",
    "uncertainty_reason: short string or empty string",
    "Rules:",
    "- service_request means the sender is asking for service, booking, quote, estimate, scheduling, or similar.",
    "- non_service means newsletter, invoice, spam, sales pitch, general admin, or unrelated email.",
    "- uncertain means intent is ambiguous or not enough information is present.",
    "- service_location_text should contain only the service location if clearly stated; otherwise empty string.",
    "- Do not invent a location.",
    "- Use the email subject and cleaned body only.",
    "",
    "Email subject:",
    payload.subject || "",
    "",
    "Email body:",
    payload.body || "",
  ].join("\n");
}

function callGeminiJson_(prompt) {
  var apiKey = getApiKey_();
  var modelName = getModelName_();
  var url = GEMINI_API_BASE_URL + encodeURIComponent(modelName) + ":generateContent";
  var payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
    },
  };

  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      "x-goog-api-key": apiKey,
    },
    payload: JSON.stringify(payload),
  });

  var code = response.getResponseCode();
  var body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("Gemini request failed: " + code + " " + body);
  }

  var decoded = JSON.parse(body);
  var candidates = decoded && decoded.candidates ? decoded.candidates : [];
  if (!candidates.length) {
    throw new Error("Gemini returned no candidates");
  }

  var candidate = candidates[0];
  if (!candidate.content || !candidate.content.parts || !candidate.content.parts.length) {
    throw new Error("Gemini returned no content parts");
  }

  var text = candidate.content.parts[0] && candidate.content.parts[0].text ? candidate.content.parts[0].text : "";
  if (!text) {
    var finishReason = candidate.finishReason || "unknown";
    throw new Error("Gemini returned empty text or blocked content: " + finishReason);
  }

  return text;
}

function parseClassificationResponse_(responseText) {
  try {
    return JSON.parse(responseText);
  } catch (err) {
    throw new Error("Invalid JSON from classifier: " + String(err) + " :: " + responseText);
  }
}

function validateClassification_(candidate, payload) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Invalid classifier schema: empty response");
  }

  var intent = normalizeIntent_(candidate.intent);
  var serviceLocationText = normalizeString_(candidate.service_location_text || candidate.location_text || "");
  var evidence = normalizeEvidence_(candidate.evidence, payload);
  var confidence = clampNumber_(candidate.confidence, 0, 1, 0.5);
  var uncertaintyReason = normalizeString_(candidate.uncertainty_reason || "");

  return {
    intent: intent,
    service_location_text: serviceLocationText,
    evidence: evidence,
    confidence: confidence,
    uncertainty_reason: uncertaintyReason,
  };
}

function normalizeIntent_(value) {
  var intent = normalizeString_(value).toLowerCase();
  if (intent === INTENT_SERVICE_REQUEST || intent === INTENT_NON_SERVICE || intent === INTENT_UNCERTAIN) {
    return intent;
  }
  return INTENT_UNCERTAIN;
}

function normalizeEvidence_(value, payload) {
  var list = Array.isArray(value) ? value : [];
  var evidence = list.map(function (item) {
    return normalizeString_(item);
  }).filter(function (item) {
    return Boolean(item);
  }).slice(0, 3);
  if (evidence.length > 0) return evidence;

  var fallback = [];
  if (payload.subject) fallback.push(payload.subject);
  if (payload.body) fallback.push(firstMeaningfulLine_(payload.body));
  return fallback.filter(function (item) {
    return Boolean(item);
  }).slice(0, 2);
}

function firstMeaningfulLine_(text) {
  var lines = (text || "").split("\n");
  for (var i = 0; i < lines.length; i += 1) {
    var line = normalizeString_(lines[i]);
    if (line) return line;
  }
  return "";
}

function normalizeString_(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function clampNumber_(value, minValue, maxValue, fallback) {
  var numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(maxValue, Math.max(minValue, numeric));
  }
  return fallback;
}
