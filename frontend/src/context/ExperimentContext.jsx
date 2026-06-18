import { createContext, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const ExperimentContext = createContext(null);
const STORAGE_KEY = "ems12172_study_id";

export function ExperimentProvider({ children }) {
  const [step, setStep] = useState("pis");
  const [studyId, setStudyId] = useState("");
  const [condition, setCondition] = useState("");
  const [demographics, setDemographics] = useState({ ageBand: "", gender: "", aiExperience: "" });

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(STORAGE_KEY, id);
    }
    setStudyId(id);
  }, []);

  const value = { step, setStep, studyId, setStudyId, condition, setCondition, demographics, setDemographics };
  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
}

export function useExperiment() {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error("useExperiment must be used inside ExperimentProvider");
  return ctx;
}
