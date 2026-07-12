import axios from "axios";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const ADMIN_KEY =
  import.meta.env.VITE_ADMIN_API_KEY || "ChangeThisAdminKey";

/* ---------------- Participant ---------------- */

export const startParticipant = () =>
  axios.post(`${API}/participants/start`, {});

export const saveConsent = (payload) =>
  axios.post(`${API}/participants/consent`, payload);

export const saveAiLiteracy = (payload) =>
  axios.post(`${API}/participants/ai-literacy`, payload);

export const logEvent = (payload) =>
  axios.post(`${API}/participants/event`, payload);

/* ---------------- Chat ---------------- */

export const sendChatMessage = (payload) =>
  axios.post(`${API}/chat/message`, payload);

/* ---------------- Questionnaire ---------------- */

export const autosaveQuestionnaire = (payload) =>
  axios.post(`${API}/responses/questionnaire/autosave`, payload);

export const submitQuestionnaire = (payload) =>
  axios.post(`${API}/responses/questionnaire/submit`, payload);

/* ---------------- Interview ---------------- */

export const autosaveInterview = (payload) =>
  axios.post(`${API}/responses/interview/autosave`, payload);

export const submitInterview = (payload) =>
  axios.post(`${API}/responses/interview/submit`, payload);

/* ---------------- Dashboard ---------------- */

export const getKpis = () =>
  axios.get(`${API}/admin/kpis`, {
    headers: {
      "x-admin-key": ADMIN_KEY,
    },
  });

export const getParticipants = () =>
  axios.get(`${API}/admin/participants`, {
    headers: {
      "x-admin-key": ADMIN_KEY,
    },
  });

/* ---------------- Export ---------------- */

export const exportUrl = (format = "csv") => {
  if (format === "xlsx") {
    return `${API}/admin/export-excel?key=${ADMIN_KEY}`;
  }

  return `${API}/admin/export-csv?key=${ADMIN_KEY}`;
};

/* ---------------- GDPR Erasure ---------------- */

export const eraseParticipant = (study_id) =>
  axios.delete(
    `${API}/admin/erase-participant/${study_id}`,
    {
      headers: {
        "x-admin-key": ADMIN_KEY,
      },
    }
  );