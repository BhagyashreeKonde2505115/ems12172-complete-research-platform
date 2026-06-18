import { useState } from "react";
import { useExperiment } from "../context/ExperimentContext.jsx";
import { sendChatMessage, logEvent } from "../utils/api.js";
import Timer from "../components/Timer.jsx";
import MessageBubble from "../components/MessageBubble.jsx";

export default function ChatTask() {
  const { studyId, setStep } = useExperiment();

  const taskInstruction =
    "Use this AI assistant to help with any workplace idea-generation, planning, presentation preparation, problem-solving, decision-making, or creative professional task of your choice. You may choose any topic relevant to your work, studies, interests, or professional background.";

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: taskInstruction,
    },
  ]);

  const [input, setInput] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim() || expired || loading) return;

    if (!studyId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Study ID is missing. Please return to the consent page and restart the session.",
        },
      ]);
      return;
    }

    const user = {
      role: "user",
      text: input.trim(),
    };

    const updated = [...messages, user];

    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage({
        study_id: studyId,
        message: user.text,
        history: updated
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role,
            text: m.text,
          })),
      });

      setMessages([
        ...updated,
        {
          role: "assistant",
          text: res.data.reply,
        },
      ]);
    } catch (e) {
      console.error("Chat request failed:", e);
      console.error("Status:", e.response?.status);
      console.error("Response:", e.response?.data);

      setMessages([
        ...updated,
        {
          role: "assistant",
          text:
            e.response?.data?.details ||
            e.response?.data?.error ||
            e.response?.data?.message ||
            "Chat request failed. Please check backend terminal for details.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    try {
      await logEvent({
        study_id: studyId,
        eventType: "chat_finished",
        payload: {
          turns: messages.length,
        },
      });
    } catch (e) {
      console.error("Failed to log finish event:", e);
    }

    setStep("questionnaire");
  };

  return (
    <main className="container py-5">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card research-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h1 className="h4 fw-bold mb-0">AI Ideation Task</h1>
              <Timer seconds={900} onExpire={() => setExpired(true)} />
            </div>

            <p className="text-muted">{taskInstruction}</p>

            <ul className="text-muted small">
              <li>Choose any work, study, planning, presentation, or professional task.</li>
              <li>Ask for ideas, structure, examples, feedback, or delivery support.</li>
              <li>You have 15 minutes to interact with the assistant.</li>
            </ul>

            {expired && (
              <div className="alert alert-warning">
                Time is complete. Please proceed to the questionnaire.
              </div>
            )}

            <button className="btn btn-indigo mt-auto" onClick={finish}>
              {expired ? "Proceed" : "Finish Task and Proceed"}
            </button>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card research-card p-4">
            <div className="chat-window p-3 mb-3">
              {messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}

              {loading && (
                <div className="text-muted small">Assistant is typing...</div>
              )}
            </div>

            <div className="input-group">
              <input
                className="form-control"
                disabled={expired || loading}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder={expired ? "Time complete" : "Type your message..."}
              />

              <button
                className="btn btn-indigo"
                disabled={expired || loading}
                onClick={send}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}