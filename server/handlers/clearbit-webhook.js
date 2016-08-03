import Clearbit from "../clearbit";

export default function handleWebhook({ hostSecret }) {
  return (req, res) => {
    const { status, type, body } = req.body;
    const { client: hull, ship } = req.hull;
    const userId = req.hull.config.userId;

    if ((type === "person" || type === "person_company") && status === 200 && userId) {
      let person;

      if (type === "person") {
        person = body;
      } else if (type === "person_company") {
        person = { ...body.person, company: body.company };
      }

      const cb = new Clearbit({ hull, ship, hostSecret });

      Promise.all([
        hull.get(`${userId}/user_report`),
        hull.get(`${userId}/segments`),
        cb.saveUser({ user: { id: userId }, person })
      ])
      .then(([user, segments]) => {
        if (cb.shouldProspect({ user, segments })) {
          const filters = cb.getFilterProspectOptions();
          cb.findSimilarPersons(person, filters);
        }
        res.json({ message: "thanks" });
      })
      .catch(error => {
        res.status(error.status || 500).json({
          stats: error.status,
          error: error.message
        });
      });
    } else {
      res.json({ message: "ignored" });
    }
  };
}
