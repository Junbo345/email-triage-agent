const ACTION_MODE = "dry_run";
const MAX_THREADS_PER_RUN = 25;
const PROCESSED_LABEL_NAME = "AI_TRIAGE_PROCESSED";
const LOG_SHEET_NAME = "AI Triage Log";
const DEFAULT_MODEL_NAME = "gpt-4.1-mini";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const LOCATION_UNKNOWN = "unknown";
const ACTION_ACCEPT = "accept";
const ACTION_REJECT = "reject";
const ACTION_CLARIFY = "clarify";
const ACTION_MANUAL_REVIEW = "manual_review";
const ACTION_IGNORE = "ignore";
const INTENT_SERVICE_REQUEST = "service_request";
const INTENT_NON_SERVICE = "non_service";
const INTENT_UNCERTAIN = "uncertain";

function getApiKey_() {
  const value = PropertiesService.getScriptProperties().getProperty("LLM_API_KEY");
  if (!value) {
    throw new Error("Missing Script Property: LLM_API_KEY");
  }
  return value;
}

function getModelName_() {
  return PropertiesService.getScriptProperties().getProperty("LLM_MODEL") || DEFAULT_MODEL_NAME;
}

function getScriptTimezone_() {
  return Session.getScriptTimeZone() || "Etc/UTC";
}

function getSettingsSummary_() {
  return {
    actionMode: ACTION_MODE,
    maxThreadsPerRun: MAX_THREADS_PER_RUN,
    processedLabelName: PROCESSED_LABEL_NAME,
    logSheetName: LOG_SHEET_NAME,
    modelName: getModelName_(),
  };
}
