
import { useCallback, useEffect, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getMaintenanceAnalytics } from "../services/api";
import "./Maintenance.css";


function Maintenance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [plantFilter, setPlantFilter] = useState("ALL");


  // Retrieve maintenance data from FastAPI.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getMaintenanceAnalytics();
      setData(response);
    } catch (err) {
      setError(
        err.message || "Unable to load maintenance records."
      );
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadData();
  }, [loadData]);


  if (loading) {
    return (
      <div className="maintenance-message">
        Loading maintenance records from Exasol...
      </div>
    );
  }


  if (error) {
    return (
      <div className="maintenance-message maintenance-error">
        <h3>Unable to load maintenance analytics</h3>
        <p>{error}</p>
        <button onClick={loadData}>Try again</button>
      </div>
    );
  }


  if (!data) return null;


  const summary = data.summary;
  const tasks = data.tasks || [];

  // Apply status and plant filters.
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      task.status === statusFilter;

    const matchesPlant =
      plantFilter === "ALL" ||
      task.plant === plantFilter;

    return matchesStatus && matchesPlant;
  });


  const pendingTasks = tasks.filter(
    (task) => task.status === "Pending"
  );


  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }


  return (
    <div className="maintenance-page">

      {/* PAGE HEADER */}
      <header className="maintenance-header">

        <div>
          <span className="section-kicker">
            ASSET CARE & RELIABILITY
          </span>

          <h1>Maintenance intelligence</h1>

          <p>
            Monitor maintenance progress, identify pending work
            and review equipment service history.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadData}
          disabled={loading}
        >
          ↻ Refresh
        </button>

      </header>


      {/* KPI CARDS */}
      <section className="maintenance-kpi-grid">

        <div className="maintenance-kpi">
          <span>Total maintenance tasks</span>
          <strong>{summary.total_tasks}</strong>
          <small>Recorded maintenance activities</small>
        </div>

        <div className="maintenance-kpi">
          <span>Completed tasks</span>
          <strong className="maintenance-green">
            {summary.completed_tasks}
          </strong>
          <small>Successfully completed records</small>
        </div>

        <div className="maintenance-kpi">
          <span>Pending tasks</span>
          <strong className="maintenance-orange">
            {summary.pending_tasks}
          </strong>
          <small>Awaiting completion</small>
        </div>

        <div className="maintenance-kpi">
          <span>Completion rate</span>
          <strong>
            {Number(summary.completion_rate).toFixed(1)}%
          </strong>
          <small>Completed / total recorded tasks</small>
        </div>

      </section>


      {/* COMPLETION PROGRESS */}
      <section className="maintenance-progress-card">

        <div className="maintenance-progress-heading">
          <div>
            <span className="section-kicker">
              MAINTENANCE PROGRESS
            </span>

            <h3>Overall task completion</h3>
          </div>

          <strong>
            {Number(summary.completion_rate).toFixed(1)}%
          </strong>
        </div>

        <div
          className="maintenance-progress-track"
          role="progressbar"
          aria-valuenow={summary.completion_rate}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Maintenance completion rate"
        >
          <div
            className="maintenance-progress-fill"
            style={{
              width: `${summary.completion_rate}%`,
            }}
          />
        </div>

        <div className="maintenance-progress-labels">
          <span>{summary.completed_tasks} completed</span>
          <span>{summary.pending_tasks} pending</span>
        </div>

      </section>


      {/* PLANT-WISE PENDING TASKS */}
      <section className="maintenance-chart-card">

        <div>
          <span className="section-kicker">
            PLANT PERFORMANCE
          </span>

          <h3>Pending maintenance by plant</h3>

          <p>
            Distribution of maintenance tasks awaiting completion.
          </p>
        </div>

        <div className="maintenance-chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data.pending_by_plant}
              margin={{
                top: 15,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                stroke="#29394d"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="plant"
                tick={{
                  fill: "#91a7bd",
                  fontSize: 11,
                }}
                axisLine={{ stroke: "#43546a" }}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fill: "#91a7bd",
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  background: "#101b2a",
                  border: "1px solid #38506a",
                  borderRadius: "8px",
                  color: "#ffffff",
                }}
                formatter={(value) => [
                  `${value} tasks`,
                  "Pending maintenance",
                ]}
              />

              <Bar
                dataKey="pending_tasks"
                fill="#e8aa61"
                radius={[5, 5, 0, 0]}
                maxBarSize={75}
              />

            </BarChart>
          </ResponsiveContainer>
        </div>

      </section>


      {/* PENDING MAINTENANCE QUEUE */}
      <section className="maintenance-table-card">

        <div className="maintenance-table-heading">

          <div>
            <span className="section-kicker">
              ACTION REQUIRED
            </span>

            <h2>Pending maintenance queue</h2>

            <p>
              Maintenance records currently marked as Pending.
            </p>
          </div>

          <span className="maintenance-count">
            {pendingTasks.length} pending
          </span>

        </div>


        <div className="maintenance-table-wrapper">

          <table className="maintenance-table">

            <thead>
              <tr>
                <th>Task ID</th>
                <th>Machine</th>
                <th>Plant</th>
                <th>Machine type</th>
                <th>Criticality</th>
                <th>Maintenance action</th>
                <th>Task date</th>
              </tr>
            </thead>

            <tbody>

              {pendingTasks.map((task) => (

                <tr key={task.maintenance_id}>

                  <td>
                    <strong>{task.maintenance_id}</strong>
                  </td>

                  <td>{task.machine_id}</td>

                  <td>{task.plant}</td>

                  <td>{task.machine_type}</td>

                  <td>{task.criticality}</td>

                  <td>{task.action}</td>

                  <td>{formatDate(task.maintenance_date)}</td>

                </tr>

              ))}


              {pendingTasks.length === 0 && (
                <tr>
                  <td colSpan="7" className="maintenance-empty">
                    No pending maintenance tasks.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* COMPLETE MAINTENANCE REGISTER */}
      <section className="maintenance-table-card">

        <div className="maintenance-table-heading">

          <div>
            <span className="section-kicker">
              MAINTENANCE REGISTER
            </span>

            <h2>Maintenance history</h2>

            <p>
              Browse all recorded maintenance activities.
            </p>
          </div>


          <div className="maintenance-filters">

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by maintenance status"
            >
              <option value="ALL">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>


            <select
              value={plantFilter}
              onChange={(event) => setPlantFilter(event.target.value)}
              aria-label="Filter by plant"
            >
              <option value="ALL">All plants</option>

              {data.pending_by_plant.map((item) => (
                <option key={item.plant} value={item.plant}>
                  {item.plant}
                </option>
              ))}

              {/* Include plants without pending tasks. */}
              {[
                "Plant A",
                "Plant B",
                "Plant C",
              ]
                .filter(
                  (plant) =>
                    !data.pending_by_plant.some(
                      (item) => item.plant === plant
                    )
                )
                .map((plant) => (
                  <option key={plant} value={plant}>
                    {plant}
                  </option>
                ))}
            </select>

          </div>

        </div>


        <div className="maintenance-table-wrapper">

          <table className="maintenance-table">

            <thead>
              <tr>
                <th>Task ID</th>
                <th>Machine</th>
                <th>Plant</th>
                <th>Maintenance action</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {filteredTasks.map((task) => (

                <tr key={task.maintenance_id}>

                  <td>
                    <strong>{task.maintenance_id}</strong>
                  </td>

                  <td>{task.machine_id}</td>

                  <td>{task.plant}</td>

                  <td>{task.action}</td>

                  <td>{formatDate(task.maintenance_date)}</td>

                  <td>
                    <span
                      className={`maintenance-status status-${task.status.toLowerCase()}`}
                    >
                      {task.status}
                    </span>
                  </td>

                </tr>

              ))}


              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan="6" className="maintenance-empty">
                    No records match the selected filters.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>


        <div className="maintenance-table-footer">
          Showing {filteredTasks.length} of {tasks.length} maintenance records.
          Data retrieved from Exasol.
        </div>

      </section>


      <footer className="maintenance-footer">
        FACTORYPULSE AI · SYNTHETIC DEMONSTRATION DATA
      </footer>

    </div>
  );
}


export default Maintenance;
