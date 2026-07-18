import { jsPDF } from "jspdf";
import {
  consentStatements,
  pisText,
} from "../data/content.js";

const STUDY_DETAILS = {
  title:
    "Evaluating an AI Assistant for Workplace and Study-Related Tasks",
  ethicsReference: "EMS12277",
  researcher:
    "Bhagyashree Yashwant Konde",
  researcherEmail:
    "2505115@abertay.ac.uk",
  duration:
    "Approximately 35–40 minutes",
};

function createPdf(
  title,
  studyId
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const margin = 18;
  const pageWidth =
    doc.internal.pageSize.getWidth();

  const pageHeight =
    doc.internal.pageSize.getHeight();

  const usableWidth =
    pageWidth - margin * 2;

  const bottomMargin = 18;

  let y = 18;

  function ensureSpace(
    height = 12
  ) {
    if (
      y + height >
      pageHeight - bottomMargin
    ) {
      doc.addPage();
      y = 18;
    }
  }

  function addText(
    value,
    options = {}
  ) {
    const {
      size = 10.5,
      style = "normal",
      after = 4,
      indent = 0,
    } = options;

    const safeValue =
      String(value ?? "");

    doc.setFont(
      "helvetica",
      style
    );

    doc.setFontSize(size);

    const lines =
      doc.splitTextToSize(
        safeValue,
        usableWidth - indent
      );

    const lineHeight =
      size * 0.48;

    ensureSpace(
      lines.length *
        lineHeight +
        after
    );

    doc.text(
      lines,
      margin + indent,
      y
    );

    y +=
      lines.length *
        lineHeight +
      after;
  }

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(18);

  doc.text(
    title,
    margin,
    y
  );

  y += 10;

  addText(
    "Abertay University Research",
    {
      size: 11,
      style: "bold",
      after: 2,
    }
  );

  addText(
    `Study: ${STUDY_DETAILS.title}`,
    {
      size: 10.5,
      after: 2,
    }
  );

  addText(
    `Ethics Reference: ${STUDY_DETAILS.ethicsReference}`,
    {
      size: 10.5,
      after: 2,
    }
  );

  if (studyId) {
    addText(
      `Participant Study ID: ${studyId}`,
      {
        size: 10.5,
        style: "bold",
        after: 7,
      }
    );
  }

  return {
    doc,
    addText,
    ensureSpace,
    getY: () => y,
    setY: (value) => {
      y = value;
    },
  };
}

function safeFilePart(
  value
) {
  return String(
    value ||
      "participant"
  ).replace(
    /[^a-zA-Z0-9-_]/g,
    "_"
  );
}

export function downloadPISPDF(
  studyId
) {
  const pdf =
    createPdf(
      "Participant Information Sheet",
      studyId
    );

  const sections =
    String(pisText || "")
      .trim()
      .split(/\n{2,}/)
      .map((section) =>
        section.trim()
      )
      .filter(Boolean);

  sections.forEach(
    (section) => {
      const lines =
        section
          .split("\n")
          .map((line) =>
            line.trim()
          )
          .filter(Boolean);

      if (!lines.length) {
        return;
      }

      const firstLine =
        lines[0];

      const looksLikeHeading =
        /^\d+\.\s/.test(
          firstLine
        ) ||
        firstLine.startsWith(
          "Study Title:"
        ) ||
        firstLine.startsWith(
          "Researcher:"
        ) ||
        firstLine.startsWith(
          "Supervisors:"
        ) ||
        firstLine.startsWith(
          "Duration:"
        );

      if (
        /^\d+\.\s/.test(
          firstLine
        )
      ) {
        pdf.addText(
          firstLine,
          {
            size: 13,
            style: "bold",
            after: 4,
          }
        );

        lines
          .slice(1)
          .forEach(
            (line) => {
              pdf.addText(
                line,
                {
                  after: 4,
                }
              );
            }
          );

        pdf.setY(
          pdf.getY() + 2
        );

        return;
      }

      if (looksLikeHeading) {
        lines.forEach(
          (line) => {
            const [
              label,
              ...rest
            ] =
              line.split(":");

            if (
              rest.length
            ) {
              pdf.addText(
                `${label}: ${rest
                  .join(":")
                  .trim()}`,
                {
                  style:
                    "normal",
                  after: 2.5,
                }
              );
            } else {
              pdf.addText(
                line,
                {
                  after: 3,
                }
              );
            }
          }
        );

        pdf.setY(
          pdf.getY() + 3
        );

        return;
      }

      pdf.addText(
        section,
        {
          after: 5,
        }
      );
    }
  );

  pdf.doc.save(
    `EMS12277_Participant_Information_${safeFilePart(
      studyId
    )}.pdf`
  );
}

export function downloadConsentPDF({
  studyId,
  demographics,
  consentChecks,
  consentedAt =
    new Date(),
}) {
  const pdf =
    createPdf(
      "Informed Consent Record",
      studyId
    );

  pdf.addText(
    "Consent Statements",
    {
      size: 13,
      style: "bold",
      after: 5,
    }
  );

  consentStatements.forEach(
    (
      statement,
      index
    ) => {
      const checked =
        Boolean(
          consentChecks?.[
            index
          ]
        );

      pdf.addText(
        `${
          checked
            ? "[X]"
            : "[ ]"
        } ${statement}`,
        {
          indent: 2,
          after: 3,
        }
      );
    }
  );

  pdf.setY(
    pdf.getY() + 3
  );

  pdf.addText(
    "Background Information",
    {
      size: 13,
      style: "bold",
      after: 5,
    }
  );

  pdf.addText(
    `Age band: ${
      demographics
        ?.ageBand ||
      "Not provided"
    }`,
    {
      after: 2,
    }
  );

  pdf.addText(
    `Gender: ${
      demographics
        ?.gender ||
      "Not provided"
    }`,
    {
      after: 2,
    }
  );

  pdf.addText(
    `Current status: ${
      demographics
        ?.status ||
      "Not provided"
    }`,
    {
      after: 6,
    }
  );

  pdf.addText(
    "Consent Confirmation",
    {
      size: 13,
      style: "bold",
      after: 5,
    }
  );

  const consentDate =
    new Date(
      consentedAt
    );

  const formattedDate =
    Number.isNaN(
      consentDate.getTime()
    )
      ? "Not available"
      : consentDate.toLocaleString(
          "en-GB"
        );

  pdf.addText(
    `Consent recorded: ${formattedDate}`,
    {
      after: 3,
    }
  );

  pdf.addText(
    "This document is the participant's personal copy of the consent information. The research system stores a pseudonymous consent record linked to the Study ID.",
    {
      after: 5,
    }
  );

  pdf.addText(
    "Data collected during this study will be securely stored by Abertay University for ten years following completion of the research, in accordance with University research data-management requirements. After this period, the data will be securely destroyed.",
    {
      after: 5,
    }
  );

  pdf.addText(
    `Researcher contact: ${STUDY_DETAILS.researcherEmail}`,
    {
      after: 3,
    }
  );

  pdf.doc.save(
    `EMS12277_Consent_${safeFilePart(
      studyId
    )}.pdf`
  );
}