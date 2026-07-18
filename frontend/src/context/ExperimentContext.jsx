import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

const ExperimentContext = createContext(null);

const initialDemographics = {
  ageBand: "",
  gender: "",
  status: "",
};

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

export function ExperimentProvider({
  children,
}) {
  const [step, setStepState] =
    useState("pis");

  const [studyId, setStudyIdState] =
    useState("");

  const [condition, setConditionState] =
    useState("");

  const [
    demographics,
    setDemographics,
  ] = useState(initialDemographics);

  const [
    aiLiteracy,
    setAiLiteracy,
  ] = useState(initialAiLiteracy);

  const [
    taskStage,
    setTaskStage,
  ] = useState(1);

  function setStep(next) {
    setStepState(next);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function setStudyId(value) {
    setStudyIdState(value || "");
  }

  function setCondition(value) {
    setConditionState(value || "");
  }

  function resetExperiment() {
    setStepState("pis");

    setStudyIdState("");

    setConditionState("");

    setDemographics({
      ...initialDemographics,
    });

    setAiLiteracy({
      ...initialAiLiteracy,
      tools: [],
      primaryUses: [],
      items: {},
    });

    setTaskStage(1);
  }

  const value = useMemo(
    () => ({
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
    }),
    [
      step,
      studyId,
      condition,
      demographics,
      aiLiteracy,
      taskStage,
    ]
  );

  return (
    <ExperimentContext.Provider value={value}>
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const ctx =
    useContext(ExperimentContext);

  if (!ctx) {
    throw new Error(
      "useExperiment must be used inside ExperimentProvider"
    );
  }

  return ctx;
}