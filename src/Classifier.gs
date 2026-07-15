function classifyEmail_(payload) {
  const prompt = buildClassificationPrompt_(payload);
  const responseText = callOpenAiJson_(prompt);
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

function callOpenAiJson_(prompt) {
  const apiKey = getApiKey_();
  const payload = {
    model: getModelName_(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You extract structured data from customer emails. Be strict, concise, and faithful to the text.",
      },
      { role: "user", content: prompt },
    ],
  };

  const response = UrlFetchApp.fetch(OPENAI_API_URL, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + apiKey,
    },
    payload: JSON.stringify(payload),
  });

  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error("OpenAI request failed: " + code + " " + body);
  }

  const decoded = JSON.parse(body);
  const choices = decoded && decoded.choices ? decoded.choices : [];
  const firstChoice = choices.length > 0 ? choices[0] : null;
  const message = firstChoice && firstChoice.message ? firstChoice.message : null;
  const text = message ? message.content : "";
  if (!text) {
    throw new Error("OpenAI returned no structured content");
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
  const intent = normalizeIntent_(candidate.intent);
  const serviceLocationText = normalizeString_(candidate.service_location_text || candidate.location_text || "");
  const evidence = normalizeEvidence_(candidate.evidence, payload);
  const confidence = clampNumber_(candidate.confidence, 0, 1, 0.5);
  const uncertaintyReason = normalizeString_(candidate.uncertainty_reason || "");

  return {
    intent: intent,
    service_location_text: serviceLocationText,
    evidence: evidence,
    confidence: confidence,
    uncertainty_reason: uncertaintyReason,
  };
}

function normalizeIntent_(value) {
  const intent = normalizeString_(value).toLowerCase();
  if (intent === INTENT_SERVICE_REQUEST || intent === INTENT_NON_SERVICE || intent === INTENT_UNCERTAIN) {
    return intent;
  }
  return INTENT_UNCERTAIN;
}

function normalizeEvidence_(value, payload) {
  const list = Array.isArray(value) ? value : [];
  const evidence = list.map((item) => normalizeString_(item)).filter(Boolean).slice(0, 3);
  if (evidence.length > 0) return evidence;

  const fallback = [];
  if (payload.subject) fallback.push(payload.subject);
  if (payload.body) fallback.push(firstMeaningfulLine_(payload.body));
  return fallback.filter(Boolean).slice(0, 2);
}

function firstMeaningfulLine_(text) {
  const lines = (text || "").split("\n");
  for (var i = 0; i < lines.length; i += 1) {
    const line = normalizeString_(lines[i]);
    if (line) return line;
  }
  return "";
}

function normalizeString_(value) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
}

function clampNumber_(value, minValue, maxValue, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return Math.min(maxValue, Math.max(minValue, numeric));
  }
  return fallback;
}
