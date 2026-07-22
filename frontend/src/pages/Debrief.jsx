import { useExperiment } from "../context/ExperimentContext.jsx";
import abertayLogo from "../assets/abertay-logo.png";
export default function Debrief() {
  const { studyId, setStep } = useExperiment();

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <div className="card research-card p-4 p-md-5 shadow-sm">
            <img
                src={abertayLogo}
                alt="Abertay University"
                className="abertay-logo mb-3"
              />
            <p className="text-primary fw-bold small text-uppercase mb-2">
              EMS12277 Debrief Sheet
            </p>

            <h1 className="h3 fw-bold mb-3">DEBRIEF SHEET</h1>

            <div className="alert alert-light border mb-4">
              <p className="mb-1">
                <strong>Study Title:</strong> Evaluating an AI Assistant for
                Workplace Idea Generation
              </p>
              <p className="mb-1">
                <strong>Ethics Reference:</strong> EMS12277
              </p>
              <p className="mb-0">
                <strong>Thank you for taking part!</strong>
              </p>
              <p className="mb-0">
                <strong>
              Your contribution will help improve our understanding of how people collaborate with conversational AI systems during creative design activities.
            </strong>
            </p>
            </div>

            <p>
              Thank you very much for completing the task, questionnaire, and
              interview. Your time and responses are genuinely valuable for this
              research. Please read the following explanation of the study before
              you close the session.
            </p>

            <h2 className="h5 fw-bold mt-4">
              What was this study really about?
            </h2>

            <p>
              We told you at the start that we were evaluating an AI assistant
              for workplace idea generation and that was true. What we did not
              tell you initially is that there were actually two different
              versions of the AI assistant being used across the study. You used
              The purpose of this study is to investigate how different conversational styles used by AI assistants influence people's experience during a creative design task. Participants complete the same design activity while interacting with one of several versions of an AI assistant. The versions differ slightly in their communication style so that researchers can examine how these differences influence user experience, trust, confidence, perceived safety, usability and creative thinking. To preserve the scientific validity of the research, specific details about the different versions are not disclosed until data collection has been completed.
             During this study we collected:
            </p>

            <ul>
              <li>
               Demographic information
              </li>
              <li>
                Your conversation with the AI assistant
              </li>
              <li>
               Questionnaire responses
              </li>
              <li>
                Previous experience using AI systems
              </li>
              <li>
                Interview responses
              </li>
            </ul>
            <p>These data will be analysed anonymously for research purposes only.</p>
            <p>
              The reason we could not tell you which version you were using
              beforehand is that knowing this in advance could have changed how
              you responded to the assistant, which would have made it
              impossible to compare the two versions fairly. This temporary
              partial non-disclosure is standard and accepted practice in
              between-subjects experimental psychology research. It does not
              involve any deception that could cause harm, and we are now fully
              disclosing the study design to you.
            </p>

            <h2 className="h5 fw-bold mt-4">Why does this matter?</h2>

            <p>
              We are trying to understand whether the tone and communication
              style of an AI workplace assistant not just what it says, but how
              it says it affects how much users trust it, how creatively
              supported they feel, and whether the overall interaction is a
              positive experience. This research is motivated by a real-world
              question raised by an industry partner (Siemens R&amp;D): how
              should AI assistants be designed to create positive interactions
              during work tasks? The findings will contribute to practical
              design guidelines for developers building workplace AI tools.
            </p>

            <h2 className="h5 fw-bold mt-4">What will happen to my data?</h2>

            <ul>
              <li>
                Your data is completely confidential and pseudonymised. It
                cannot be linked back to you personally.
              </li>
              <li>
                It will be stored securely on Abertay University encrypted
                servers for a maximum of five years and then permanently deleted.
              </li>
              <li>
                Results will only ever be reported at group level no individual
                participant is identifiable in any output.
              </li>
              <li>
                No data will be shared with Siemens or any other third party.
              </li>
            </ul>

            <h2 className="h5 fw-bold mt-4">Can I still withdraw my data?</h2>

            <p>
              Yes. Even after reading this debrief, if you would prefer your
              data not to be included in the study, please email the researcher
              at{" "}
              <a href="mailto:2505115@abertay.ac.uk">
                2505115@abertay.ac.uk
              </a>{" "}
              within two weeks of your participation date, quoting your study
              ID. Your data will be permanently deleted with no questions asked
              and no consequences.
            </p>

            <div className="alert alert-light border">
              <p className="mb-1">
                <strong>Your Study ID:</strong>
              </p>
              <p className="fw-bold fs-5 mb-0">{studyId}</p>
            </div>

            <h2 className="h5 fw-bold mt-4">Contact Details</h2>

            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Researcher</th>
                    <th>Supervisor</th>
                    <th>Ethics Concerns</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Bhagyashree Yashwant Konde
                      <br />
                      <a href="mailto:2505115@abertay.ac.uk">
                        2505115@abertay.ac.uk
                      </a>
                    </td>
                    <td>
                      Dr George Lovell
                      <br />
                      <a href="mailto:p.g.lovell@abertay.ac.uk">
                        p.g.lovell@abertay.ac.uk
                      </a>
                    </td>
                    <td>
                      <a href="mailto:researchethics@abertay.ac.uk">
                        researchethics@abertay.ac.uk
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="alert alert-warning mt-4">
              ⚠ If you have found any aspect of this study distressing, please
              contact Abertay University Student Services at{" "}
              <a href="mailto:studentservices@abertay.ac.uk">
                studentservices@abertay.ac.uk
              </a>{" "}
              or the Samaritans (free, 24hr) on 116 123. The study involved no
              sensitive or harmful content, but your wellbeing always comes
              first.
            </div>

            <div className="d-flex justify-content-end mt-4">
              <button
                className="btn btn-indigo px-4"
                onClick={() => setStep("thankyou")}
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}