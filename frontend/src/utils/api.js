import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5001/api";

const api = axios.create({
  baseURL: API_URL,

  headers: {
    "Content-Type":
      "application/json",
  },

  timeout: 20000,
});

/*
 * Optional request logging during development.
 */
api.interceptors.request.use(
  (config) => {
    if (
      import.meta.env.DEV
    ) {
      console.log(
        "API request:",
        config.method?.toUpperCase(),
        `${config.baseURL}${config.url}`
      );
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

/*
 * Optional response error logging.
 */
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      import.meta.env.DEV
    ) {
      console.error(
        "API error:",
        {
          message:
            error.message,

          status:
            error.response
              ?.status,

          data:
            error.response
              ?.data,

          url:
            error.config
              ?.url,
        }
      );
    }

    return Promise.reject(
      error
    );
  }
);

/*
 * Participant creation.
 *
 * The backend generates:
 * - study_id
 * - WC or NI condition
 */
export const startParticipant = (studyId) =>
  api.post("/participants/start", {
    study_id: studyId,
  });

/*
 * Save informed consent
 * and demographics.
 */
export const saveConsent =
  (payload) =>
    api.post(
      "/participants/consent",
      payload
    );

/*
 * Save pre-task AI literacy
 * responses.
 */
export const saveAiLiteracy =
  (payload) =>
    api.post(
      "/participants/ai-literacy",
      payload
    );

/*
 * Send a participant message
 * to the AI assistant.
 */
export const sendChatMessage =
  (payload) =>
    api.post(
      "/chat/message",
      payload
    );

/*
 * Save questionnaire responses.
 */
export const saveQuestionnaire = (payload) =>
  api.post("/responses/questionnaire", payload);

export const autosaveQuestionnaire = (payload) =>
  api.post("/responses/questionnaire/autosave", payload);
export const submitQuestionnaire = (payload) =>
  api.post(    "/responses/questionnaire", payload);
/*
 * Save interview responses.
 */
export const saveInterview =
  (payload) =>
    api.post(
      "/responses/interview",
      payload
    );

/*
 * Record participant interaction
 * events such as:
 * - chat_started
 * - task_stage_changed
 * - chat_completed
 */
export const logEvent =
  (payload) =>
    api.post(
      "/participants/event",
      payload
    );

/*
 * Delete participant data
 * using Study ID.
 *
 * Update this path if your
 * backend GDPR route is different.
 */
export const deleteParticipantData =
  (studyId) =>
    api.delete(
      `/participants/${studyId}`
    );

export default api;