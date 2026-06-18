export default function MessageBubble({ message }) {
  return <div className={`message ${message.role === "user" ? "user" : "assistant"}`}>{message.text}</div>;
}
