
import { useCallback, useEffect, useState } from "react";

import { getHealth, getRiskScores } from "./services/api";

import MachineDetail from "./components/MachineDetail";
import DowntimeAnalysis from "./components/DowntimeAnalysis";
import Maintenance from "./components/Maintenance";

import "./App.css";


function App() {
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);

  const [databaseStatus, setDatabaseStatus] = useState("Checking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [activePage, setActivePage] = useState("overview");


  // Load dashboard data from FastAPI and Exasol.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [health, riskResponse] = await Promise.all([
        getHealth(),
        getRiskScores(),
      ]);

      setDatabaseStatus(
        health.database === "connected"
          ? "Connected"
          : "Unavailable"
      );

      setMachines(riskResponse.risk_scores || []);
      setLastUpdated(new Date());

    } catch (err) {
      setDatabaseStatus("Unavailable");
      setError(err.message || "Unable to load factory data.");

    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);


  // Dashboard KPI calculations.
  const totalDowntime = machines.reduce(
    (sum, machine) =>
      sum + Number(machine.downtime_hours || 0),
    0
  );

  const highRiskCount = machines.filter(
    (machine) => machine.risk_level === "HIGH"
  ).length;

  const maintenanceCount = machines.filter(
    (machine) => Number(machine.overdue_maintenance) === 1
  ).length;

  const sensorAlertCount = machines.filter(
    (machine) =>
      Number(machine.high_temp_readings) > 0 ||
      Number(machine.high_vibration_readings) > 0
  ).length;


  // Display the most important machines first.
  const priorityMachines = machines.slice(0, 8);


  function getRiskClass(level) {
    return `risk-${String(level || "low").toLowerCase()}`;
  }


  function getSignals(machine) {
    const signals = [];

    if (Number(machine.high_temp_readings) > 0) {
      signals.push("High temperature");
    }

    if (Number(machine.high_vibration_readings) > 0) {
      signals.push("High vibration");
    }

    if (Number(machine.downtime_hours) >= 12) {
      signals.push("Significant downtime");
    }

    if (Number(machine.overdue_maintenance) === 1) {
      signals.push("Pending maintenance");
    }

    return signals.length
      ? signals
      : ["No triggered indicators"];
  }


  return (
    <div className="app-shell">

      {/* LEFT SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">FP</div>

          <div>
            <h2>FactoryPulse</h2>
            <span>AI OPERATIONS</span>
          </div>
        </div>


        <div className="sidebar-label">
          WORKSPACE
        </div>


        {/* MAIN NAVIGATION */}
        <nav className="navigation">

          {/* OVERVIEW */}
          <button
            type="button"
            className={`nav-item ${
              activePage === "overview" ? "active" : ""
            }`}
            onClick={() => setActivePage("overview")}
          >
            <span>▦</span>
            Overview
          </button>


          {/* MACHINE HEALTH - NOT IMPLEMENTED YET */}
          <button
            type="button"
            className="nav-item nav-item-disabled"
            disabled
            aria-disabled="true"
          >
            <span>◉</span>
            Machine health
          </button>


          {/* DOWNTIME ANALYSIS */}
          <button
            type="button"
            className={`nav-item ${
              activePage === "downtime" ? "active" : ""
            }`}
            onClick={() => setActivePage("downtime")}
          >
            <span>◷</span>
            Downtime analysis
          </button>


          {/* MAINTENANCE */}
          <button
            type="button"
            className={`nav-item ${
              activePage === "maintenance" ? "active" : ""
            }`}
            onClick={() => setActivePage("maintenance")}
          >
            <span>⚙</span>
            Maintenance
          </button>

        </nav>


        {/* DATABASE CONNECTION STATUS */}
        <div className="sidebar-bottom">

          <span
            className={`connection-dot ${
              databaseStatus === "Connected" ? "" : "offline"
            }`}
          ></span>

          <div>
            <strong>
              {databaseStatus === "Connected"
                ? "Exasol connected"
                : "Database unavailable"}
            </strong>

            <small>Local database</small>
          </div>

        </div>

      </aside>


      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* DOWNTIME PAGE */}
        {activePage === "downtime" ? (

          <DowntimeAnalysis />

        ) : activePage === "maintenance" ? (

          /* MAINTENANCE PAGE */
          <Maintenance />

        ) : (

          /* OVERVIEW PAGE */
          <>

            {/* HEADER */}
            <header className="topbar">

              <div>
                <span className="breadcrumb">
                  WORKSPACE / OVERVIEW
                </span>

                <h1>Factory overview</h1>

                <p>
                  Monitor machine health, downtime and maintenance priorities.
                </p>
              </div>


              <div className="topbar-right">

                <div className="database-status">

                  <span
                    className={`status-dot ${
                      databaseStatus === "Connected"
                        ? "online"
                        : "offline"
                    }`}
                  ></span>

                  {databaseStatus}

                </div>


                <button
                  type="button"
                  className="refresh-button"
                  onClick={loadDashboard}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "↻ Refresh"}
                </button>

              </div>

            </header>


            {/* ERROR MESSAGE */}
            {error && (

              <div className="error-message">

                <strong>
                  Unable to retrieve factory data.
                </strong>

                <span>{error}</span>

                <button
                  type="button"
                  onClick={loadDashboard}
                >
                  Try again
                </button>

              </div>

            )}


            {/* OPERATIONAL SUMMARY */}
            <section className="section-heading">

              <div>
                <span className="section-kicker">
                  LIVE DATABASE VIEW
                </span>

                <h2>Operational summary</h2>
              </div>

              <span className="updated-time">
                {lastUpdated
                  ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
                  : "Waiting for data"}
              </span>

            </section>


            {/* KPI CARDS */}
            <section className="kpi-grid">

              {/* TOTAL MACHINES */}
              <div className="kpi-card">

                <div className="kpi-top">
                  <span>Machines monitored</span>
                  <span className="kpi-icon">▦</span>
                </div>

                <strong>
                  {loading ? "—" : machines.length}
                </strong>

                <small>Total registered machines</small>

              </div>


              {/* HIGH RISK */}
              <div className="kpi-card">

                <div className="kpi-top">
                  <span>High-risk machines</span>
                  <span className="kpi-icon red-icon">!</span>
                </div>

                <strong className="red-value">
                  {loading ? "—" : highRiskCount}
                </strong>

                <small>Require priority inspection</small>

              </div>


              {/* DOWNTIME */}
              <div className="kpi-card">

                <div className="kpi-top">
                  <span>Total downtime</span>
                  <span className="kpi-icon orange-icon">◷</span>
                </div>

                <strong>
                  {loading
                    ? "—"
                    : `${totalDowntime.toFixed(1)} h`}
                </strong>

                <small>Recorded across all machines</small>

              </div>


              {/* MAINTENANCE */}
              <div className="kpi-card">

                <div className="kpi-top">
                  <span>Maintenance reviews</span>
                  <span className="kpi-icon blue-icon">⚙</span>
                </div>

                <strong>
                  {loading ? "—" : maintenanceCount}
                </strong>

                <small>Machines with pending maintenance</small>

              </div>

            </section>


            {/* SECONDARY CARDS */}
            <section className="secondary-grid">

              {/* SENSOR INTELLIGENCE */}
              <div className="info-card">

                <div className="card-heading">

                  <div>
                    <span className="section-kicker">
                      SENSOR INTELLIGENCE
                    </span>

                    <h3>Machines with abnormal readings</h3>
                  </div>

                  <span className="large-metric">
                    {loading ? "—" : sensorAlertCount}
                  </span>

                </div>

                <p>
                  Machines with at least one temperature or vibration
                  indicator above the configured demonstration thresholds.
                </p>

              </div>


              {/* RISK ENGINE */}
              <div className="info-card">

                <div className="card-heading">

                  <div>
                    <span className="section-kicker">
                      RISK ENGINE
                    </span>

                    <h3>Scoring methodology</h3>
                  </div>

                  <span className="engine-label">
                    RULE BASED
                  </span>

                </div>

                <p>
                  Risk scores combine sensor anomalies, historical
                  downtime and pending maintenance using transparent
                  scoring rules.
                </p>

              </div>

            </section>


            {/* MACHINE RISK RANKING */}
            <section className="table-section">

              <div className="table-heading">

                <div>
                  <span className="section-kicker">
                    PRIORITY MONITORING
                  </span>

                  <h2>Machine risk ranking</h2>

                  <p>
                    Select a machine to inspect its detailed sensor history.
                  </p>
                </div>

                <span className="record-count">
                  {loading
                    ? "Loading..."
                    : `${machines.length} machines`}
                </span>

              </div>


              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>Machine</th>
                      <th>Plant / Type</th>
                      <th>Risk score</th>
                      <th>Downtime</th>
                      <th>Triggered indicators</th>
                      <th>Risk level</th>
                    </tr>
                  </thead>


                  <tbody>

                    {!loading && priorityMachines.map((machine) => (

                      <tr
                        key={machine.machine_id}
                        className={
                          selectedMachine?.machine_id === machine.machine_id
                            ? "selected-machine-row"
                            : ""
                        }
                      >

                        {/* CLICKABLE MACHINE ID */}
                        <td>

                          <button
                            type="button"
                            className="machine-select"
                            onClick={() => setSelectedMachine(machine)}
                            aria-label={`View details for ${machine.machine_id}`}
                          >
                            {machine.machine_id}
                          </button>

                          <small>
                            {machine.criticality} criticality
                          </small>

                        </td>


                        {/* PLANT AND TYPE */}
                        <td>
                          {machine.plant}
                          <small>{machine.machine_type}</small>
                        </td>


                        {/* RISK SCORE */}
                        <td>

                          <span
                            className={`score-number ${
                              getRiskClass(machine.risk_level)
                            }`}
                          >
                            {machine.risk_score}/100
                          </span>

                        </td>


                        {/* DOWNTIME */}
                        <td>

                          <strong>
                            {Number(machine.downtime_hours).toFixed(1)} h
                          </strong>

                          <small>
                            {machine.failure_count} recorded failures
                          </small>

                        </td>


                        {/* TRIGGERED INDICATORS */}
                        <td>

                          <div className="signal-list">

                            {getSignals(machine).map((signal) => (

                              <span
                                key={signal}
                                className="signal-tag"
                              >
                                {signal}
                              </span>

                            ))}

                          </div>

                        </td>


                        {/* RISK LEVEL */}
                        <td>

                          <span
                            className={`risk-badge ${
                              getRiskClass(machine.risk_level)
                            }`}
                          >
                            {machine.risk_level}
                          </span>

                        </td>

                      </tr>

                    ))}


                    {/* LOADING STATE */}
                    {loading && (

                      <tr>
                        <td colSpan="6" className="table-message">
                          Retrieving machine analytics from Exasol...
                        </td>
                      </tr>

                    )}


                    {/* EMPTY STATE */}
                    {!loading && !error && machines.length === 0 && (

                      <tr>
                        <td colSpan="6" className="table-message">
                          No machine records available.
                        </td>
                      </tr>

                    )}

                  </tbody>

                </table>

              </div>


              <div className="table-footer">
                Showing the first {Math.min(8, machines.length)}
                {" "}priority machines. All {machines.length}
                {" "}records are retrieved from Exasol.
              </div>

            </section>


            {/* MACHINE DETAIL PANEL */}
            {selectedMachine && (

              <MachineDetail
                machine={selectedMachine}
                onClose={() => setSelectedMachine(null)}
              />

            )}


            {/* OVERVIEW FOOTER */}
            <footer className="app-footer">

              <span>FACTORYPULSE AI</span>

              <span>
                Synthetic demonstration data · Exasol-powered analytics
              </span>

            </footer>

          </>

        )}

      </main>

    </div>
  );
}


export default App;
