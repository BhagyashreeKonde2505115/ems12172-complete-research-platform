import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(
        "API request:",
        config.method?.toUpperCase(),
        `${config.baseURL}${config.url}`
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error("API error:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
    }

    return Promise.reject(error);
  }
);

/* Participant flow */

export const startParticipant = () =>
  api.post("/participants/start", {});

export const saveConsent = (payload) =>
  api.post("/participants/consent", payload);

export const saveAiLiteracy = (payload) =>
  api.post(
    "/participants/ai-literacy",
    payload
  );

export const logEvent = (payload) =>
  api.post("/participants/event", payload);

/* Chat */

export const sendChatMessage = (payload) =>
  api.post("/chat/message", payload);

/* Questionnaire */

export const autosaveQuestionnaire = (
  payload
) =>
  api.post(
    "/responses/questionnaire/autosave",
    payload
  );

export const submitQuestionnaire = (
  payload
) =>
  api.post(
    "/responses/questionnaire",
    payload
  );

/* Interview */

export const autosaveInterview = (
  payload
) =>
  api.post(
    "/responses/interview/autosave",
    payload
  );

export const submitInterview = (
  payload
) =>
  api.post(
    "/responses/interview",
    payload
  );

/* Research dashboard */

export const getKpis = (adminKey) =>
  api.get("/admin/kpis", {
    headers: {
      "x-admin-key": adminKey,
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
      "x-admin-key": adminKey,
    },
  });

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
        "x-admin-key": adminKey,
      },
    }
  );

export const exportUrl = (
  format,
  adminKey
) => {
  const baseUrl =
    API_URL.replace(/\/$/, "");

  const route =
    format === "xlsx" ||
    format === "excel"
      ? "/admin/export-excel"
      : "/admin/export-csv";

  return `${baseUrl}${route}?key=${encodeURIComponent(
    adminKey || ""
  )}`;
};

export default api;