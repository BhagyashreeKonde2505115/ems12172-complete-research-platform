import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const ExperimentContext = createContext(null);
const STORAGE_KEY = "ems12172_study_id";
const STEP_KEY = "ems12172_study_step";

export function ExperimentProvider({ children }) {
  const [step, setStepState] = useState(() => localStorage.getItem(STEP_KEY) || "pis");
  const [studyId, setStudyId] = useState("");
  const [condition, setCondition] = useState("");
  const [demographics, setDemographics] = useState({ ageBand: "", gender: "", status: "" });
  const [aiLiteracy, setAiLiteracy] = useState({
    usedBefore: "",
    tools: [],
    otherTool: "",
    mostUsed: "",
    frequency: "",
    duration: "",
    primaryUses: [],
    items: {},
    baselineTrust: "",
  });
  const [taskStage, setTaskStage] = useState(1);

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setStudyId(id);
  }, []);

  const setStep = (next) => {
    localStorage.setItem(STEP_KEY, next);
    setStepState(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const value = useMemo(() => ({
    step,
    setStep,
    studyId,
    setStudyId,
    condition,
    setCondition,
    demographics,
    setDemographics,
    aiLiteracy,
    setAiLiteracy,
    taskStage,
    setTaskStage,
  }), [step, studyId, condition, demographics, aiLiteracy, taskStage]);

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment() {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error("useExperiment must be used inside ExperimentProvider");
  return ctx;
}
