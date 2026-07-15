function getReplyTemplate_(action) {
  const templates = {
    accept: {
      subject: "Re: Service Request",
      body:
        "Thanks for your message. We can help with your Oakville service request and will follow up shortly.\n\nReference: {{service_location}}",
    },
    reject: {
      subject: "Re: Service Request",
      body:
        "Thanks for reaching out. We only serve Oakville, so we are unable to take this request.\n\nReference: {{service_location}}",
    },
    clarify: {
      subject: "Re: Service Request",
      body:
        "Thanks for your message. Could you please share the service location so we can confirm eligibility?",
    },
    manual_review: {
      subject: "Re: Service Request",
      body: "Thanks for your message. We are reviewing this manually and will respond if needed.",
    },
    ignore: {
      subject: "Re: Service Request",
      body: "",
    },
  };
  return templates[action] || templates.manual_review;
}

function fillReplyTemplate_(templateBody, payload, classification, location, decision) {
  const replacements = {
    "{{subject}}": payload.subject || "",
    "{{service_location}}": location.canonical || location.resolved || LOCATION_UNKNOWN,
    "{{intent}}": classification.intent || "",
    "{{reason}}": decision.reason || "",
  };
  var body = templateBody || "";
  Object.keys(replacements).forEach((key) => {
    body = body.replace(new RegExp(escapeRegExp_(key), "g"), replacements[key]);
  });
  return body.trim();
}

function escapeRegExp_(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
