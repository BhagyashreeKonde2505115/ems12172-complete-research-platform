import axios from "axios";

const ENV_API_URL = import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !ENV_API_URL) {
  throw new Error(
    "VITE_API_URL is missing. Add the Render backend URL in Vercel Environment Variables and redeploy."
  );
}

const API = (
  ENV_API_URL || "http://localhost:5001/api"
).replace(/\/$/, "");

console.log("Configured API URL:", API);

const api = axios.create({
  baseURL: API,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/* ---------------- Participant ---------------- */

export const startParticipant = () =>
  api.post("/participants/start", {});

export const saveConsent = (payload) =>
  api.post("/participants/consent", payload);

export const saveAiLiteracy = (payload) =>
  api.post("/participants/ai-literacy", payload);

export const logEvent = (payload) =>
  api.post("/participants/event", payload);

export const markParticipantIncomplete = (payload) =>
  api.post("/participants/mark-incomplete", payload);

/* ---------------- Chat ---------------- */

export const sendChatMessage = (payload) =>
  api.post("/chat/message", payload);

/* ---------------- Questionnaire ---------------- */

export const autosaveQuestionnaire = (payload) =>
  api.post("/responses/questionnaire/autosave", payload);

export const submitQuestionnaire = (payload) =>
  api.post("/responses/questionnaire/submit", payload);

/* ---------------- Interview ---------------- */

export const autosaveInterview = (payload) =>
  api.post("/responses/interview/autosave", payload);

export const submitInterview = (payload) =>
  api.post("/responses/interview/submit", payload);

/* ---------------- Dashboard ---------------- */

function requireAdminKey(adminKey) {
  if (!adminKey) {
    throw new Error("Admin key is required.");
  }

  return adminKey;
}

export const getKpis = (adminKey) =>
  api.get("/admin/kpis", {
    headers: {
      "x-admin-key": requireAdminKey(adminKey),
    },
  });

  
export const getParticipants = (
  adminKey,
  search = ""
) =>
  api.get("/admin/participants", {
    params: {
      search,
    },
    headers: {
      "x-admin-key": requireAdminKey(adminKey),
    },
  });

/* ---------------- Export ---------------- */

export const exportUrl = (
  format = "csv",
  adminKey = ""
) => {
  const safeAdminKey =
    requireAdminKey(adminKey);

  const route =
    format === "xlsx" ||
    format === "excel"
      ? "/admin/export-excel"
      : "/admin/export-csv";

  return `${API}${route}?key=${encodeURIComponent(
    safeAdminKey
  )}`;
};

/* ---------------- GDPR Erasure ---------------- */

export const eraseParticipant = (
  studyId,
  adminKey
) =>
  api.delete(
    `/admin/erase-participant/${encodeURIComponent(
      studyId
    )}`,
    {
      headers: {
        "x-admin-key":
          requireAdminKey(adminKey),
      },
    }
  );

export default api;