import { useEffect, useState } from "react";
export default function Timer({ seconds = 900, onExpire }) {
  const [time, setTime] = useState(seconds);
  useEffect(() => {
    if (time <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setTime(time - 1), 1000);
    return () => clearTimeout(t);
  }, [time, onExpire]);
  const m = String(Math.floor(time/60)).padStart(2,"0");
  const s = String(time%60).padStart(2,"0");
  return <span className="timer-badge badge text-bg-light border px-3 py-2">{m}:{s}</span>;
}
