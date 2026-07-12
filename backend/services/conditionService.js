async function assignBalancedCondition(Participant) {
  const counts = await Participant.aggregate([
    { $group: { _id: "$condition", count: { $sum: 1 } } }
  ]);
  const wc = counts.find(c => c._id === "WC")?.count || 0;
  const ni = counts.find(c => c._id === "NI")?.count || 0;
  if (wc < ni) return "WC";
  if (ni < wc) return "NI";
  return Math.random() < 0.5 ? "WC" : "NI";
}
module.exports = { assignBalancedCondition };
