import ReactMarkdown from "react-markdown";

export default function MessageBubble({
  message,
}) {
  const text = String(
    message?.text ||
      message?.content ||
      ""
  );

  const isUser =
    message?.role === "user";

  const isStageMessage =
    message?.messageType ===
    "stage-transition";

  const isCompletionMessage =
    message?.messageType ===
    "task-complete";

  const bubbleClass = [
    "message",
    isUser
      ? "user"
      : "assistant",
    isStageMessage
      ? "stage-message"
      : "",
    isCompletionMessage
      ? "completion-message"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`d-flex mb-3 ${
        isUser
          ? "justify-content-end"
          : "justify-content-start"
      }`}
    >
      <div className={bubbleClass}>
        <div className="small fw-bold mb-2">
          {isUser
            ? "You"
            : isStageMessage
              ? "Stage guidance"
              : "AI Assistant"}
        </div>

        {isUser ? (
          <p
            className="mb-0"
            style={{
              whiteSpace: "pre-wrap",
            }}
          >
            {text}
          </p>
        ) : (
          <div className="message-markdown">
            <ReactMarkdown>
              {text}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}