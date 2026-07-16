import { useEffect, useState } from "react";
import {
  eraseParticipant,
  exportUrl,
  getKpis,
  getParticipants,
} from "../utils/api.js";

export default function Dashboard() {
  const [adminKey, setAdminKey] = useState(
    () => sessionStorage.getItem("ems12277_admin_key") || ""
  );

  const [keyInput, setKeyInput] = useState("");
  const [authenticated, setAuthenticated] = useState(Boolean(adminKey));

  const [kpis, setKpis] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadDashboard(key = adminKey) {
    if (!key) {
      setError("Enter the researcher admin key.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [kpiResponse, participantResponse] = await Promise.all([
        getKpis(key),
        getParticipants(key, search),
      ]);

      setKpis(kpiResponse.data);
      setParticipants(participantResponse.data || []);
      setAuthenticated(true);

      sessionStorage.setItem("ems12277_admin_key", key);
      setAdminKey(key);
    } catch (requestError) {
      console.error("Dashboard load failed:", requestError);

      const status = requestError?.response?.status;

      if (status === 403) {
        sessionStorage.removeItem("ems12277_admin_key");
        setAuthenticated(false);
        setAdminKey("");

        setError("The admin key is incorrect.");
      } else {
        setError(
          requestError?.response?.data?.error ||
            requestError?.message ||
            "The dashboard could not be loaded."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!adminKey) {
      return;
    }

    loadDashboard(adminKey);
  }, []);

  async function handleLogin(event) {
    event.preventDefault();

    const cleanKey = keyInput.trim();

    if (!cleanKey) {
      setError("Enter the researcher admin key.");
      return;
    }

    await loadDashboard(cleanKey);
  }

  function handleLogout() {
    sessionStorage.removeItem("ems12277_admin_key");

    setAdminKey("");
    setKeyInput("");
    setAuthenticated(false);
    setKpis(null);
    setParticipants([]);
    setError("");
  }

  async function handleSearch(event) {
    event.preventDefault();
    await loadDashboard(adminKey);
  }

  async function handleEraseParticipant(studyId) {
    const confirmed = window.confirm(
      `Permanently delete all data for ${studyId}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await eraseParticipant(studyId, adminKey);

      setParticipants((currentParticipants) =>
        currentParticipants.filter(
          (participant) => participant.study_id !== studyId
        )
      );

      await loadDashboard(adminKey);
    } catch (deleteError) {
      console.error("Participant deletion failed:", deleteError);

      setError(
        deleteError?.response?.data?.error ||
          deleteError?.message ||
          "Participant data could not be deleted."
      );
    }
  }

  function handleExport(format) {
    try {
      const url = exportUrl(format, adminKey);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (exportError) {
      setError(exportError.message);
    }
  }

  if (!authenticated) {
    return (
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="card research-card p-4 p-md-5">
              <p className="text-uppercase text-primary fw-bold small mb-1">
                Researcher access
              </p>

              <h1 className="h3 fw-bold mb-3">
                Admin Dashboard
              </h1>

              <p className="text-muted">
                Enter the private admin key configured in the Render backend.
              </p>

              <form onSubmit={handleLogin}>
                <label
                  htmlFor="adminKey"
                  className="form-label fw-semibold"
                >
                  Admin key
                </label>

                <input
                  id="adminKey"
                  type="password"
                  className="form-control"
                  value={keyInput}
                  onChange={(event) => setKeyInput(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter admin key"
                />

                {error && (
                  <div className="alert alert-danger mt-3" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-indigo w-100 mt-3"
                  disabled={loading}
                >
                  {loading ? "Checking…" : "Open Dashboard"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-fluid py-4 px-3 px-lg-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <p className="text-uppercase text-primary fw-bold small mb-1">
            EMS12277 Research
          </p>

          <h1 className="h3 fw-bold mb-0">
            Researcher Dashboard
          </h1>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => loadDashboard(adminKey)}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => handleExport("csv")}
          >
            Export CSV
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => handleExport("xlsx")}
          >
            Export Excel
          </button>

          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {kpis && (
        <div className="row g-3 mb-4">
          <KpiCard
            label="Total participants"
            value={kpis.total ?? 0}
          />

          <KpiCard
            label="Completed"
            value={kpis.completed ?? 0}
          />

          <KpiCard
            label="Completion rate"
            value={`${kpis.completionRate ?? 0}%`}
          />

          <KpiCard
            label="Chat messages"
            value={kpis.chats ?? 0}
          />

          <KpiCard
            label="Questionnaires"
            value={kpis.questionnaires ?? 0}
          />

          <KpiCard
            label="Interviews"
            value={kpis.interviews ?? 0}
          />
        </div>
      )}

      {kpis?.conditionBalance && (
        <div className="card research-card p-3 mb-4">
          <h2 className="h5 fw-bold mb-3">
            Condition balance
          </h2>

          <div className="d-flex gap-4">
            <div>
              <span className="text-muted d-block small">
                Warm Collaborative
              </span>
              <strong>{kpis.conditionBalance.WC ?? 0}</strong>
            </div>

            <div>
              <span className="text-muted d-block small">
                Neutral Informational
              </span>
              <strong>{kpis.conditionBalance.NI ?? 0}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="card research-card p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <h2 className="h5 fw-bold mb-0">
            Participants
          </h2>

          <form
            className="d-flex gap-2"
            onSubmit={handleSearch}
          >
            <input
              type="search"
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Study ID"
            />

            <button
              type="submit"
              className="btn btn-outline-primary"
              disabled={loading}
            >
              Search
            </button>
          </form>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Study ID</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Current status</th>
                <th>AI frequency</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {participants.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-4">
                    No participant records found.
                  </td>
                </tr>
              ) : (
                participants.map((participant) => (
                  <tr key={participant.study_id}>
                    <td>{participant.study_id}</td>
                    <td>{participant.condition}</td>
                    <td>{participant.status}</td>
                    <td>{participant.ageBand || "—"}</td>
                    <td>{participant.gender || "—"}</td>
                    <td>{participant.employmentStatus || "—"}</td>
                    <td>{participant.aiFrequency || "—"}</td>
                    <td>
                      {participant.createdAt
                        ? new Date(
                            participant.createdAt
                          ).toLocaleString()
                        : "—"}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() =>
                          handleEraseParticipant(participant.study_id)
                        }
                      >
                        Delete
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

function KpiCard({ label, value }) {
  return (
    <div className="col-6 col-md-4 col-xl-2">
      <div className="card research-card h-100 p-3">
        <span className="text-muted small">
          {label}
        </span>

        <strong className="display-6">
          {value}
        </strong>
      </div>
    </div>
  );
}