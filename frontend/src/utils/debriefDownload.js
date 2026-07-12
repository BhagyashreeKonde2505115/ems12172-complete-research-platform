export function downloadDebrief(studyId) {
  if (!studyId) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>EMS12277 Debrief - ${studyId}</title><style>body{font-family:Arial,sans-serif;line-height:1.6;max-width:850px;margin:40px auto;padding:0 24px;color:#172033}h1,h2{color:#243b67}.id{padding:16px;border:2px solid #243b67;border-radius:8px;font-size:20px;font-weight:bold}.note{background:#f3f5f9;padding:16px;border-left:4px solid #243b67}</style></head><body><h1>Debrief Sheet</h1><p><strong>Ethics Reference:</strong> EMS12277</p><p class="id">Participant Study ID: ${studyId}</p><h2>What was this study about?</h2><p>This study examined whether the conversational communication style of an AI assistant influences trust, creativity, psychological safety, usability and overall user experience during participant-selected professional or academic tasks.</p><h2>What was varied?</h2><p>Participants were randomly assigned to either a warm, collaborative assistant or a neutral, informational assistant. The interface and intended capability remained the same. This detail was withheld before the task to reduce demand characteristics.</p><h2>Withdrawal</h2><p>Keep your participant ID if you wish to request withdrawal within the period stated in the approved Participant Information Sheet.</p><div class="note">Thank you for taking part in this research.</div></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `EMS12277_Debrief_${studyId}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
