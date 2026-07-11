const counts =
  await Participant.aggregate([
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