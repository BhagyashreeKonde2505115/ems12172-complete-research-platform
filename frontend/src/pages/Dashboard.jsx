import { useEffect, useMemo, useState } from "react";
import {
  eraseParticipant,
  exportUrl,
  getKpis,
  getParticipants,
} from "../utils/api.js";

const ADMIN_STORAGE_KEY = "ems12277_admin_key";

export default function Dashboard() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");

  const [authenticated, setAuthenticated] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const [kpis, setKpis] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const savedKey =
      sessionStorage.getItem(ADMIN_STORAGE_KEY) || "";

    if (!savedKey) {
      setAuthenticated(false);
      return;
    }

    setAdminKey(savedKey);
    setKeyInput(savedKey);

    loadDashboard(savedKey, "");
  }, []);

  async function loadDashboard(key, searchTerm = search) {
    const cleanKey = String(key || "").trim();

    if (!cleanKey) {
      setAuthenticated(false);
      setError("Please enter the researcher admin key.");
      return false;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const [kpiResponse, participantResponse] =
        await Promise.all([
          getKpis(cleanKey),
          getParticipants(cleanKey, searchTerm),
        ]);

      setKpis(kpiResponse.data);
      setParticipants(
        Array.isArray(participantResponse.data)
          ? participantResponse.data
          : []
      );

      setAdminKey(cleanKey);
      setAuthenticated(true);

      sessionStorage.setItem(
        ADMIN_STORAGE_KEY,
        cleanKey
      );

      return true;
    } catch (requestError) {
      console.error(
        "Dashboard load failed:",
        requestError
      );

      const status =
        requestError?.response?.status;

      if (status === 401 || status === 403) {
        sessionStorage.removeItem(
          ADMIN_STORAGE_KEY
        );

        setAdminKey("");
        setAuthenticated(false);
        setKpis(null);
        setParticipants([]);

        setError(
          "The admin key is incorrect. Please enter the key configured in Render."
        );
      } else {
        setError(
          requestError?.response?.data?.error ||
            requestError?.response?.data?.details ||
            requestError?.message ||
            "The dashboard could not be loaded."
        );
      }

      return false;
    } finally {
      setLoading(false);
      setCheckingKey(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    const cleanKey = keyInput.trim();

    if (!cleanKey) {
      setError("Please enter the researcher admin key.");
      return;
    }

    setCheckingKey(true);
    await loadDashboard(cleanKey, "");
  }

  function handleLogout() {
    sessionStorage.removeItem(
      ADMIN_STORAGE_KEY
    );

    setAdminKey("");
    setKeyInput("");
    setAuthenticated(false);

    setKpis(null);
    setParticipants([]);
    setSearch("");

    setError("");
    setSuccessMessage("");
  }

  async function handleRefresh() {
    await loadDashboard(adminKey, search);
  }

  async function handleSearch(event) {
    event.preventDefault();
    await loadDashboard(adminKey, search.trim());
  }

  async function handleClearSearch() {
    setSearch("");
    await loadDashboard(adminKey, "");
  }

  async function handleDeleteParticipant(
    studyId
  ) {
    if (!studyId) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete all stored data for ${studyId}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccessMessage("");

    try {
      await eraseParticipant(
        studyId,
        adminKey
      );

      setSuccessMessage(
        `All data for ${studyId} was deleted successfully.`
      );

      await loadDashboard(
        adminKey,
        search
      );
    } catch (deleteError) {
      console.error(
        "Participant deletion failed:",
        deleteError
      );

      setError(
        deleteError?.response?.data?.error ||
          deleteError?.response?.data?.details ||
          deleteError?.message ||
          "Participant data could not be deleted."
      );
    }
  }

  function handleExport(format) {
    setError("");
    setSuccessMessage("");

    try {
      const url = exportUrl(
        format,
        adminKey
      );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (exportError) {
      console.error(
        "Export failed:",
        exportError
      );

      setError(
        exportError?.message ||
          "The export could not be started."
      );
    }
  }

  const conditionBalance = useMemo(
    () => ({
      WC:
        kpis?.conditionBalance?.WC ?? 0,

      NI:
        kpis?.conditionBalance?.NI ?? 0,
    }),
    [kpis]
  );

  if (!authenticated) {
    return (
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-sm-11 col-md-7 col-lg-5">
            <div className="card research-card border-0 shadow-sm p-4 p-md-5">
              <p className="text-uppercase text-primary fw-bold small mb-1">
                EMS12277 Researcher Access
              </p>

              <h1 className="h3 fw-bold mb-3">
                Admin Dashboard
              </h1>

              <p className="text-muted mb-4">
                Enter the private admin key stored in
                the Render backend environment.
              </p>

              <form onSubmit={handleLogin}>
                <label
                  htmlFor="admin-key"
                  className="form-label fw-semibold"
                >
                  Admin key
                </label>

                <input
                  id="admin-key"
                  type="password"
                  className="form-control"
                  value={keyInput}
                  onChange={(event) => {
                    setKeyInput(
                      event.target.value
                    );

                    setError("");
                  }}
                  placeholder="Enter private admin key"
                  autoComplete="current-password"
                  disabled={checkingKey}
                  autoFocus
                />

                {error && (
                  <div
                    className="alert alert-danger mt-3"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-indigo w-100 mt-3"
                  disabled={
                    checkingKey ||
                    !keyInput.trim()
                  }
                >
                  {checkingKey
                    ? "Checking key…"
                    : "Open Dashboard"}
                </button>
              </form>

              <p className="small text-muted mt-4 mb-0">
                Enter only the key value. Do not enter
                “ADMIN_API_KEY=”.
              </p>
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
            EMS12277 Research Platform
          </p>

          <h1 className="h3 fw-bold mb-1">
            Researcher Dashboard
          </h1>

          <p className="text-muted mb-0">
            Monitor participant progress and export
            research data.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading
              ? "Refreshing…"
              : "Refresh"}
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() =>
              handleExport("csv")
            }
          >
            Export CSV
          </button>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() =>
              handleExport("xlsx")
            }
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
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          className="alert alert-success"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <div className="row g-3 mb-4">
        <KpiCard
          label="Total participants"
          value={kpis?.total ?? 0}
        />

        <KpiCard
          label="Completed"
          value={kpis?.completed ?? 0}
        />

        <KpiCard
          label="Completion rate"
          value={`${
            kpis?.completionRate ?? 0
          }%`}
        />

        <KpiCard
          label="Chat messages"
          value={kpis?.chats ?? 0}
        />

        <KpiCard
          label="Questionnaires"
          value={
            kpis?.questionnaires ?? 0
          }
        />

        <KpiCard
          label="Interviews"
          value={kpis?.interviews ?? 0}
        />
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card research-card h-100 p-4">
            <h2 className="h5 fw-bold mb-3">
              Condition balance
            </h2>

            <div className="row g-3">
              <div className="col-6">
                <div className="border rounded-3 p-3 h-100">
                  <span className="small text-muted d-block">
                    Warm Collaborative
                  </span>

                  <strong className="h3 mb-0">
                    {conditionBalance.WC}
                  </strong>
                </div>
              </div>

              <div className="col-6">
                <div className="border rounded-3 p-3 h-100">
                  <span className="small text-muted d-block">
                    Neutral Informational
                  </span>

                  <strong className="h3 mb-0">
                    {conditionBalance.NI}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card research-card h-100 p-4">
            <h2 className="h5 fw-bold mb-3">
              Data summary
            </h2>

            <dl className="row mb-0">
              <dt className="col-7">
                Participant records
              </dt>

              <dd className="col-5 text-end">
                {participants.length}
              </dd>

              <dt className="col-7">
                Questionnaire records
              </dt>

              <dd className="col-5 text-end">
                {kpis?.questionnaires ??
                  0}
              </dd>

              <dt className="col-7">
                Interview records
              </dt>

              <dd className="col-5 text-end">
                {kpis?.interviews ?? 0}
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <section className="card research-card p-3 p-md-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h2 className="h5 fw-bold mb-1">
              Participants
            </h2>

            <p className="text-muted small mb-0">
              Search, review or erase participant
              records.
            </p>
          </div>

          <form
            className="d-flex flex-wrap gap-2"
            onSubmit={handleSearch}
          >
            <input
              type="search"
              className="form-control"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search Study ID"
              aria-label="Search participant Study ID"
            />

            <button
              type="submit"
              className="btn btn-outline-primary"
              disabled={loading}
            >
              Search
            </button>

            {search && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={
                  handleClearSearch
                }
                disabled={loading}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th scope="col">
                  Study ID
                </th>

                <th scope="col">
                  Condition
                </th>

                <th scope="col">
                  Status
                </th>

                <th scope="col">
                  Age band
                </th>

                <th scope="col">
                  Gender
                </th>

                <th scope="col">
                  Current status
                </th>

                <th scope="col">
                  AI used
                </th>

                <th scope="col">
                  AI frequency
                </th>

                <th scope="col">
                  Created
                </th>

                <th
                  scope="col"
                  className="text-end"
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading &&
              participants.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="text-center text-muted py-5"
                  >
                    Loading participant records…
                  </td>
                </tr>
              ) : participants.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="text-center text-muted py-5"
                  >
                    No participant records found.
                  </td>
                </tr>
              ) : (
                participants.map(
                  (participant) => (
                    <tr
                      key={
                        participant.study_id
                      }
                    >
                      <td className="fw-semibold text-nowrap">
                        {
                          participant.study_id
                        }
                      </td>

                      <td>
                        {participant.condition ||
                          "—"}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            participant.status
                          }
                        />
                      </td>

                      <td>
                        {participant.ageBand ||
                          "—"}
                      </td>

                      <td>
                        {participant.gender ||
                          "—"}
                      </td>

                      <td>
                        {participant.employmentStatus ||
                          "—"}
                      </td>

                      <td>
                        {participant.aiUsedBefore ||
                          "—"}
                      </td>

                      <td>
                        {participant.aiFrequency ||
                          "—"}
                      </td>

                      <td className="text-nowrap">
                        {formatDate(
                          participant.createdAt
                        )}
                      </td>

                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            handleDeleteParticipant(
                              participant.study_id
                            )
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="col-6 col-md-4 col-xl-2">
      <div className="card research-card h-100 p-3">
        <span className="text-muted small mb-1">
          {label}
        </span>

        <strong className="h2 mb-0">
          {value}
        </strong>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus =
    String(status || "").toLowerCase();

  let className =
    "badge text-bg-secondary";

  if (
    [
      "completed",
      "finished",
      "thankyou",
    ].includes(normalizedStatus)
  ) {
    className =
      "badge text-bg-success";
  } else if (
    [
      "started",
      "consented",
      "ai_literacy",
      "questionnaire",
      "interview",
    ].includes(normalizedStatus)
  ) {
    className =
      "badge text-bg-primary";
  } else if (
    normalizedStatus === "withdrawn"
  ) {
    className =
      "badge text-bg-danger";
  }

  return (
    <span className={className}>
      {status || "Unknown"}
    </span>
  );
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}