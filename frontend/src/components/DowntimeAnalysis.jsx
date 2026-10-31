
import { useEffect, useState } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getDowntimeAnalytics } from "../services/api";
import "./DowntimeAnalysis.css";


function DowntimeAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("ALL");


  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await getDowntimeAnalytics();
      setData(response);
    } catch (err) {
      setError(err.message || "Unable to load downtime analytics.");
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadData();
  }, []);


  const events = data?.events || [];

  const filteredEvents = events.filter((event) => {
    return (
      selectedPlant === "ALL" ||
      event.plant === selectedPlant
    );
  });


  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }


  if (loading) {
    return (
      <div className="downtime-loading">
        Loading downtime analytics from Exasol...
      </div>
    );
  }


  if (error) {
    return (
      <div className="downtime-error">
        <h3>Unable to load downtime analytics</h3>
        <p>{error}</p>
        <button onClick={loadData}>Try again</button>
      </div>
    );
  }


  if (!data) return null;

  const summary = data.summary;

  return (
    <div className="downtime-page">

      {/* PAGE HEADER */}
      <div className="downtime-header">

        <div>
          <span className="section-kicker">
            OPERATIONAL INTELLIGENCE
          </span>

          <h1>Downtime analysis</h1>

          <p>
            Understand equipment interruptions, failure patterns
            and downtime distribution across your plants.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadData}
          disabled={loading}
        >
          ↻ Refresh
        </button>

      </div>


      {/* KPI CARDS */}
      <section className="downtime-kpi-grid">

        <div className="downtime-kpi">
          <span>Total downtime events</span>
          <strong>{summary.total_events}</strong>
          <small>Recorded failure events</small>
        </div>

        <div className="downtime-kpi">
          <span>Total downtime</span>
          <strong>
            {Number(summary.total_downtime_hours).toFixed(1)} h
          </strong>
          <small>Combined equipment downtime</small>
        </div>

        <div className="downtime-kpi">
          <span>Affected machines</span>
          <strong>{summary.affected_machines}</strong>
          <small>Machines with recorded failures</small>
        </div>

        <div className="downtime-kpi">
          <span>High-severity events</span>
          <strong className="downtime-danger">
            {summary.high_severity_events}
          </strong>
          <small>Events classified as High</small>
        </div>

      </section>


      {/* CHARTS */}
      <section className="downtime-charts-grid">

        {/* PLANT COMPARISON */}
        <div className="downtime-chart-card">

          <div className="downtime-chart-heading">
            <div>
              <span className="section-kicker">
                PLANT PERFORMANCE
              </span>

              <h3>Downtime by plant</h3>
            </div>
          </div>

          <p className="downtime-chart-description">
            Total recorded downtime hours for each factory plant.
          </p>

          <div className="downtime-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.by_plant}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="#29394d"
                  strokeDasharray="4 4"
                />

                <XAxis
                  dataKey="plant"
                  tick={{ fill: "#93a8bd", fontSize: 11 }}
                  axisLine={{ stroke: "#43546a" }}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fill: "#93a8bd", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />

                <Tooltip
                  contentStyle={{
                    background: "#101b2a",
                    border: "1px solid #38506a",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                  formatter={(value) => [
                    `${Number(value).toFixed(1)} hours`,
                    "Downtime",
                  ]}
                />

                <Bar
                  dataKey="downtime_hours"
                  fill="#54cdb9"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={65}
                />

              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>


        {/* FAILURE TYPE BREAKDOWN */}
        <div className="downtime-chart-card">

          <div className="downtime-chart-heading">
            <div>
              <span className="section-kicker">
                FAILURE INTELLIGENCE
              </span>

              <h3>Downtime by failure type</h3>
            </div>
          </div>

          <p className="downtime-chart-description">
            Identify the failure categories contributing most to downtime.
          </p>

          <div className="downtime-chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.by_failure_type}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 15, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="#29394d"
                  strokeDasharray="4 4"
                />

                <XAxis
                  type="number"
                  tick={{ fill: "#93a8bd", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="failure_type"
                  width={115}
                  tick={{ fill: "#b5c5d5", fontSize: 10 }}
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
                    `${Number(value).toFixed(1)} hours`,
                    "Downtime",
                  ]}
                />

                <Bar
                  dataKey="downtime_hours"
                  fill="#efa65f"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={24}
                />

              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

      </section>


      {/* EVENT TABLE */}
      <section className="downtime-events-card">

        <div className="downtime-events-heading">

          <div>
            <span className="section-kicker">
              FAILURE REGISTER
            </span>

            <h2>Downtime events</h2>

            <p>
              Detailed history of recorded equipment interruptions.
            </p>
          </div>

          <select
            value={selectedPlant}
            onChange={(event) => setSelectedPlant(event.target.value)}
            className="plant-filter"
          >
            <option value="ALL">All plants</option>

            {data.by_plant.map((plant) => (
              <option key={plant.plant} value={plant.plant}>
                {plant.plant}
              </option>
            ))}

          </select>

        </div>


        <div className="downtime-table-wrapper">

          <table className="downtime-table">

            <thead>
              <tr>
                <th>Event ID</th>
                <th>Machine</th>
                <th>Plant</th>
                <th>Failure type</th>
                <th>Severity</th>
                <th>Start time</th>
                <th>End time</th>
                <th>Duration</th>
              </tr>
            </thead>

            <tbody>

              {filteredEvents.map((event) => (

                <tr key={event.event_id}>

                  <td>
                    <strong>{event.event_id}</strong>
                  </td>

                  <td>{event.machine_id}</td>

                  <td>{event.plant}</td>

                  <td>{event.failure_type}</td>

                  <td>
                    <span
                      className={`severity-badge severity-${event.severity.toLowerCase()}`}
                    >
                      {event.severity}
                    </span>
                  </td>

                  <td>{formatDate(event.start_time)}</td>

                  <td>{formatDate(event.end_time)}</td>

                  <td>
                    <strong>
                      {Number(event.duration_hours).toFixed(1)} h
                    </strong>
                  </td>

                </tr>

              ))}


              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan="8" className="downtime-empty">
                    No downtime events found for this plant.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>


        <div className="downtime-table-footer">
          Showing {filteredEvents.length} of {events.length} recorded events.
          {" "}Data retrieved from Exasol.
        </div>

      </section>


      {/* FOOTER */}
      <div className="downtime-footer">
        FACTORYPULSE AI · SYNTHETIC DEMONSTRATION DATA
      </div>

    </div>
  );
}


export default DowntimeAnalysis;
