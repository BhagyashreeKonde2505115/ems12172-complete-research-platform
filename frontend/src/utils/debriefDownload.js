import { jsPDF } from "jspdf";

export function downloadDebrief(studyId) {
  if (!studyId) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 18;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const usableWidth = pageWidth - margin * 2;

  let y = 20;

  function addTitle(text) {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(text, margin, y);
    y += 10;
  }

  function addHeading(text) {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(text, margin, y);
    y += 8;
  }

  function addParagraph(text) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(text, usableWidth);

    if (y + lines.length * 6 > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    doc.text(lines, margin, y);
    y += lines.length * 6 + 4;
  }

  function addBullet(text) {
    addParagraph("• " + text);
  }

  addTitle("Research Debrief Form");

  addParagraph("Abertay University");

  addParagraph("Ethics Reference: EMS12277");

  addParagraph(`Participant Study ID: ${studyId}`);

  addHeading("Thank You");

  addParagraph(
    "Thank you for taking part in this research study. Your participation is greatly appreciated and will contribute to understanding how people collaborate with Artificial Intelligence during creative design activities."
  );

  addHeading("Purpose of the Study");

  addParagraph(
    "The purpose of this research is to investigate how different conversational styles used by Artificial Intelligence assistants influence people's experience during collaborative design tasks."
  );

  addParagraph(
    "Participants completed the same design task while interacting with one of several versions of an AI assistant. Although the task was identical, the AI assistant may have communicated differently as part of the experimental design."
  );

  addParagraph(
    "Specific details of these differences are intentionally not disclosed until completion of the study in order to preserve the scientific validity of the research."
  );

  addHeading("What Information Was Collected?");

  addBullet("Demographic information");

  addBullet("Previous experience using AI");

  addBullet("Conversation with the AI assistant");

  addBullet("Questionnaire responses");

  addBullet("Interview responses");

  addParagraph(
    "All information will be analysed anonymously for research purposes."
  );

  addHeading("Why Were Different AI Responses Used?");

  addParagraph(
    "Different participants interacted with different versions of the AI assistant. These differences were intentionally designed to investigate how conversational behaviour influences user experience, trust, confidence, usability and creative thinking."
  );

  addParagraph(
    "The specific version used during your participation is not disclosed because revealing this information could influence future participants."
  );

  addHeading("Data Storage");

  addParagraph(
    "Data collected during this study will be securely stored by Abertay University for ten years following completion of the research, in accordance with University research data management policy. After this period all research data will be securely destroyed."
  );

  addHeading("Withdrawal of Data");

  addParagraph(
    "If you wish to withdraw your data, please contact the researcher quoting your Study ID. Requests can only be processed before the data have been anonymised and included in the final analysis."
  );

  addHeading("Research Contacts");

  addParagraph(
    "Researcher:\nBhagyashree Konde\n2505115@abertay.ac.uk\nAbertay University"
  );

  addParagraph(
    "Supervisor:\nDr George Lovell\np.g.lovell@abertay.ac.uk\nAbertay University"
  );

  addParagraph(
    "Supervisor:\nDr Andrea Szymkowiak\na.szymkowiak@abertay.ac.uk\nAbertay University"
  );

  addHeading("Ethics Approval");

  addParagraph(
    "This study has received ethical approval from Abertay University."
  );

  addParagraph("Ethics Reference: EMS12277");

  addHeading("Thank You");

  addParagraph(
    "Thank you once again for taking part in this study. Your contribution is valuable and will help improve our understanding of effective human–AI collaboration."
  );

  doc.save(`EMS12277_Debrief_${studyId}.pdf`);
}