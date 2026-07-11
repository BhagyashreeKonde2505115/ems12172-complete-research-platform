import ReactMarkdown from "react-markdown";

export default function MessageBubble({ message }) {
  const text = message.text || message.content || "";
  return <div className={`message ${message.role === "user" ? "user" : "assistant"}`}>
    {message.role === "user" ? <p className="mb-0">{text}</p> : <ReactMarkdown>{text}</ReactMarkdown>}
  </div>;
}
