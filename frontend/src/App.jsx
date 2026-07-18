import { useExperiment } from "./context/ExperimentContext.jsx";
import PIS from "./pages/PIS.jsx";
import Consent from "./pages/Consent.jsx";
import ChatTask from "./pages/ChatTask.jsx";
import Questionnaire from "./pages/Questionnaire.jsx";
import AILiteracy from "./pages/AILiteracy.jsx";
import Interview from "./pages/Interview.jsx";
import Debrief from "./pages/Debrief.jsx";
import ThankYou from "./pages/ThankYou.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import IncompleteThankYou from "./pages/IncompleteThankYou.jsx";

export default function App() {
  const { step } = useExperiment();
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();

  if (path === "/dashboard") return <Dashboard />;

  return (
    <div className="app-shell">
      {step === "pis" && <PIS />}
      {step === "consent" && <Consent />}
      {step === "chat" && <ChatTask />}
      {step === "questionnaire" && <Questionnaire />}
      {step === "ai-literacy" && <AILiteracy />}
      {step === "interview" && <Interview />}
      {step === "debrief" && <Debrief />}
      {step === "thankyou" && <ThankYou />}
      {step === "incomplete-thankyou" && (<IncompleteThankYou />)}
    </div>
  );
}
