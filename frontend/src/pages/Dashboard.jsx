import { useEffect, useState } from "react";
import {
  eraseParticipant,
  exportUrl,
  getKpis,
  getParticipants,
} from "../utils/api.js";

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [kpiRes, participantRes] = await Promise.all([
          getKpis(),
          getParticipants(),
        ]);

        setKpis(kpiRes.data || {});

        const participantData = Array.isArray(participantRes.data)
          ? participantRes.data
          : participantRes.data?.participants || [];

        setParticipants(participantData);
      } catch (err) {
        console.error("Dashboard load failed:", err);

        setError(
          err.response?.data?.error ||
            err.response?.data?.details ||
            err.message ||
            "Dashboard failed to load. Check backend admin routes and API key."
        );

        setParticipants([]);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [refresh]);

  const erase = async (id) => {
    if (!window.confirm(`Hard-purge all data for ${id}?`)) return;

    try {
      await eraseParticipant(id);
      setRefresh((x) => x + 1);
    } catch (err) {
      console.error("Erase failed:", err);
      alert(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Erase failed. Check backend console."
      );
    }
  };

  const safeParticipants = Array.isArray(participants) ? participants : [];

  const cards = [
    ["Total Participants", kpis?.total ?? 0],
    ["Completed", kpis?.completed ?? 0],
    ["Completion Rate", `${kpis?.completionRate ?? 0}%`],
    ["Chat Messages", kpis?.chats ?? 0],
    ["Questionnaires", kpis?.questionnaires ?? 0],
    ["Interviews", kpis?.interviews ?? 0],
    ["Warm Condition", kpis?.conditionBalance?.WC ?? 0],
    ["Neutral Condition", kpis?.conditionBalance?.NI ?? 0],
  ];

  return (
    <main className="container py-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <p className="text-primary fw-bold small text-uppercase mb-1">
            EMS12277
          </p>
          <h1 className="fw-bold mb-1">Researcher Dashboard</h1>
          <p className="text-muted mb-0">Live study monitoring and export</p>
        </div>

        <div className="d-flex gap-2">
          <a className="btn btn-outline-primary" href={exportUrl("csv")}>
            Export CSV
          </a>

          <a className="btn btn-indigo" href={exportUrl("xlsx")}>
            Export Excel
          </a>
        </div>
      </div>

      {loading && (
        <div className="alert alert-light border">
          Loading dashboard data...
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3 mb-4">
        {cards.map(([label, value]) => (
          <div className="col-6 col-md-3" key={label}>
            <div className="card research-card p-3 h-100 shadow-sm">
              <p className="text-muted small mb-1">{label}</p>
              <h2 className="fw-bold mb-0">{value}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="card research-card p-4 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h5 fw-bold mb-0">Participants</h2>

          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setRefresh((x) => x + 1)}
          >
            Refresh
          </button>
        </div>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Study ID</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Age</th>
                <th>AI Experience</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {safeParticipants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-muted text-center py-4">
                    No participants found yet.
                  </td>
                </tr>
              ) : (
                safeParticipants.map((p) => (
                  <tr key={p.study_id || p._id}>
                    <td className="small fw-semibold">
                      {p.study_id || "-"}
                    </td>

                    <td>{p.condition || "-"}</td>

                    <td>
                      <span className="badge text-bg-light border">
                        {p.status || "unknown"}
                      </span>
                    </td>

                    <td>{p.ageBand || "-"}</td>

                    <td>{p.aiExperience || "-"}</td>

                    <td className="small">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleString()
                        : "-"}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={!p.study_id}
                        onClick={() => erase(p.study_id)}
                      >
                        Erase
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}