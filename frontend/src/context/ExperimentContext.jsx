import {
  createContext,
  useContext,
  useState,
} from "react";

const ExperimentContext =
  createContext(null);

const STEP_KEY =
  "EMS12277_study_step";

const STUDY_ID_KEY =
  "EMS12277_study_id";

const CONDITION_KEY =
  "EMS12277_condition";

export function ExperimentProvider({
  children,
}) {
  const [step, setStepState] =
    useState(
      () =>
        localStorage.getItem(STEP_KEY) ||
        "pis"
    );

  const [studyId, setStudyIdState] =
    useState(
      () =>
        localStorage.getItem(
          STUDY_ID_KEY
        ) || ""
    );

  const [
    condition,
    setConditionState,
  ] = useState(
    () =>
      localStorage.getItem(
        CONDITION_KEY
      ) || ""
  );

  const [
    demographics,
    setDemographics,
  ] = useState({
    ageBand: "",
    gender: "",
    status: "",
  });

  const [
    aiLiteracy,
    setAiLiteracy,
  ] = useState({
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

  const [
    taskStage,
    setTaskStage,
  ] = useState(1);

  function setStep(nextStep) {
    localStorage.setItem(
      STEP_KEY,
      nextStep
    );

    setStepState(nextStep);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function setStudyId(value) {
    if (value) {
      localStorage.setItem(
        STUDY_ID_KEY,
        value
      );
    } else {
      localStorage.removeItem(
        STUDY_ID_KEY
      );
    }

    setStudyIdState(value);
  }

  function setCondition(value) {
    if (value) {
      localStorage.setItem(
        CONDITION_KEY,
        value
      );
    } else {
      localStorage.removeItem(
        CONDITION_KEY
      );
    }

    setConditionState(value);
  }

  function resetExperiment() {
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(
      STUDY_ID_KEY
    );
    localStorage.removeItem(
      CONDITION_KEY
    );

    localStorage.removeItem(
      "experiment_state"
    );

    sessionStorage.removeItem(
      "current_participant"
    );

    setStudyIdState("");
    setConditionState("");
    setStepState("pis");

    setDemographics({
      ageBand: "",
      gender: "",
      status: "",
    });

    setAiLiteracy({
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

    setTaskStage(1);
  }

  return (
    <ExperimentContext.Provider
      value={{
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
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const context =
    useContext(
      ExperimentContext
    );

  if (!context) {
    throw new Error(
      "useExperiment must be used inside ExperimentProvider"
    );
  }

  return context;
}