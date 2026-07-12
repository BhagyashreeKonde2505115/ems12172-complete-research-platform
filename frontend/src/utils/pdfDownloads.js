import jsPDF from "jspdf";

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 7) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function downloadPISPDF() {
  const doc = new jsPDF();
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Participant Information Sheet", 15, y);

  y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const content = `
Study Title: Evaluating an AI Assistant for Workplace Idea Generation
Ethics Reference: EMS12172

Researcher: Bhagyashree Yashwant Konde
Email: 2505115@abertay.ac.uk

Supervisors:
Dr G. Lovell - p.g.lovell@abertay.ac.uk
Dr A. Szymkowiak - a.szymkowiak@abertay.ac.uk

Duration: Approximately 35-40 minutes

This study investigates how AI-powered chat assistants can support people when doing creative work tasks. Participation is voluntary. You may stop at any time. Your data will be pseudonymised and stored securely. You may withdraw your data within two weeks by emailing the researcher and quoting your Study ID.

Please refer to the on-screen Participant Information Sheet for the full study details.
`;

  y = addWrappedText(doc, content, 15, y, 180);

  doc.save("EMS12172_Participant_Information_Sheet.pdf");
}

export function downloadConsentPDF({ studyId, demographics }) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Informed Consent Confirmation", 15, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  const content = `
Study Title: Evaluating an AI Assistant for Workplace Idea Generation
Ethics Reference: EMS12172

Participant Study ID: ${studyId || "Not available"}

This confirms that the participant ticked all required informed consent statements before continuing with the study.

Demographics recorded:
Age Band: ${demographics?.ageBand || "-"}
Gender: ${demographics?.gender || "-"}
AI Experience: ${demographics?.aiExperience || "-"}

The participant confirmed that:
- They read and understood the Participant Information Sheet.
- Participation is voluntary.
- They may withdraw data within two weeks.
- They understand they will use an AI-powered assistant.
- Their data will be pseudonymised and kept confidential.
- Their anonymised data may be used in the MSc dissertation and academic outputs.
- Data will be stored securely in accordance with GDPR.
- They are aged 18 or over.
- They agree to take part in the study.

To withdraw data, email:
2505115@abertay.ac.uk

Researcher:
Bhagyashree Yashwant Konde
Abertay University
`;

  addWrappedText(doc, content, 15, y, 180);

  doc.save(`EMS12172_Consent_Confirmation_${studyId || "participant"}.pdf`);
}