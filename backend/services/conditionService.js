/**
 * Assigns participants evenly between:
 * WC = Warm Collaborative
 * NI = Neutral Informational
 *
 * This file intentionally uses CommonJS because the rest of the
 * backend uses require() and module.exports.
 */
async function assignBalancedCondition(Participant) {
  if (!Participant) {
    throw new Error(
      "Participant model is required for condition assignment."
    );
  }

  const counts = await Participant.aggregate([
    {
      $match: {
        status: {
          $ne: "withdrawn",
        },
      },
    },
    {
      $group: {
        _id: "$condition",
        count: {
          $sum: 1,
        },
      },
    },
  ]);

  const wcCount =
    counts.find((item) => item._id === "WC")?.count || 0;

  const niCount =
    counts.find((item) => item._id === "NI")?.count || 0;

  if (wcCount < niCount) {
    return "WC";
  }

  if (niCount < wcCount) {
    return "NI";
  }

  return Math.random() < 0.5 ? "WC" : "NI";
}

module.exports = {
  assignBalancedCondition,
};