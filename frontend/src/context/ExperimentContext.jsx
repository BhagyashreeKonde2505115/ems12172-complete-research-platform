import { createContext, useContext, useMemo, useState } from "react";

const ExperimentContext = createContext(null);

const STEP_KEY = "ems12277_study_step";
const STUDY_ID_KEY = "ems12277_study_id";
const CONDITION_KEY = "ems12277_condition";

const initialDemographics = { ageBand: "", gender: "", status: "" };
const initialAiLiteracy = {
  usedBefore: "",
  tools: [],
  otherTool: "",
  mostUsed: "",
  frequency: "",
  duration: "",
  primaryUses: [],
  items: {},
  baselineTrust: "",
};

export function ExperimentProvider({ children }) {
  const [step, setStepState] = useState(() => localStorage.getItem(STEP_KEY) || "pis");
  const [studyId, setStudyIdState] = useState(() => localStorage.getItem(STUDY_ID_KEY) || "");
  const [condition, setConditionState] = useState(() => localStorage.getItem(CONDITION_KEY) || "");
  const [demographics, setDemographics] = useState(initialDemographics);
  const [aiLiteracy, setAiLiteracy] = useState(initialAiLiteracy);
  const [taskStage, setTaskStage] = useState(1);

  function setStep(next) {
    localStorage.setItem(STEP_KEY, next);
    setStepState(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setStudyId(value) {
    if (value) localStorage.setItem(STUDY_ID_KEY, value);
    else localStorage.removeItem(STUDY_ID_KEY);
    setStudyIdState(value || "");
  }

  function setCondition(value) {
    if (value) localStorage.setItem(CONDITION_KEY, value);
    else localStorage.removeItem(CONDITION_KEY);
    setConditionState(value || "");
  }

  function resetExperiment() {
    [
      STEP_KEY,
      STUDY_ID_KEY,
      CONDITION_KEY,
      "ems12172_study_step",
      "ems12172_study_id",
      "ems12172_condition",
      "studyId",
      "study_id",
      "condition",
      "experimentState",
      "experiment_state",
      "ems12172_session",
    ].forEach((key) => localStorage.removeItem(key));

    sessionStorage.removeItem("current_participant");
    setStepState("pis");
    setStudyIdState("");
    setConditionState("");
    setDemographics({ ...initialDemographics });
    setAiLiteracy({ ...initialAiLiteracy, tools: [], primaryUses: [], items: {} });
    setTaskStage(1);
  }

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
    resetExperiment,
  }), [step, studyId, condition, demographics, aiLiteracy, taskStage]);

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment() {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error("useExperiment must be used inside ExperimentProvider");
  return ctx;
}
