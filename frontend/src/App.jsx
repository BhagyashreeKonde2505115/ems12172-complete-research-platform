import { useExperiment } from "./context/ExperimentContext.jsx";
import PISConsent from "./pages/PISConsent.jsx";
import ChatTask from "./pages/ChatTask.jsx";
import Questionnaire from "./pages/Questionnaire.jsx";
import Interview from "./pages/Interview.jsx";
import Debrief from "./pages/Debrief.jsx";
import ThankYou from "./pages/ThankYou.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const { step } = useExperiment();
  const path = window.location.pathname;
  if (path === "/dashboard") return <Dashboard />;

  return (
    <div className="app-shell">
      {step === "pis" && <PISConsent />}
      {step === "chat" && <ChatTask />}
      {step === "questionnaire" && <Questionnaire />}
      {step === "interview" && <Interview />}
      {step === "debrief" && <Debrief />}
      {step === "thankyou" && <ThankYou />}
    </div>
  );
}
