
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getMachineSensors } from "../services/api";
import "./MachineDetail.css";

function MachineDetail({ machine, onClose }) {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSensors() {
      setLoading(true);
      setError("");
      setReadings([]);

      try {
        const response = await getMachineSensors(machine.machine_id);

        if (active) {
          setReadings(response.readings || []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load sensor history.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSensors();

    return () => {
      active = false;
    };
  }, [machine.machine_id]);

  const chartData = useMemo(() => {
    return readings.map((reading) => ({
      time: String(reading.reading_time)
        .replace("T", " ")
        .slice(5, 16),

      temperature:
        reading.temperature_c == null
          ? null
          : Number(reading.temperature_c),

      vibration:
        reading.vibration_mm_s == null
          ? null
          : Number(reading.vibration_mm_s),

    }));
  }, [readings]);

  const latestReading = readings[readings.length - 1];

  const validTemperatures = readings
    .map((r) => r.temperature_c)
    .filter((v) => v != null)
    .map(Number);

  const validVibrations = readings
    .map((r) => r.vibration_mm_s)
    .filter((v) => v != null)
    .map(Number);

  const maxTemperature = validTemperatures.length
    ? Math.max(...validTemperatures)
    : null;

  const maxVibration = validVibrations.length
    ? Math.max(...validVibrations)
    : null;

  const missingRows = readings.filter(
    (r) =>
      r.temperature_c == null ||
      r.vibration_mm_s == null ||
      r.pressure_bar == null
  ).length;

  const riskClass = `risk-${String(machine.risk_level).toLowerCase()}`;

  return (
    <section className="machine-detail">

      <div className="detail-header">
        <div>
          <span className="section-kicker">MACHINE INTELLIGENCE</span>

          <h2>{machine.machine_id} — Machine details</h2>

          <p>
            {machine.plant} · {machine.machine_type} ·{" "}
            {machine.criticality} criticality
          </p>
        </div>

        <button className="close-detail" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      <div className="detail-summary">

        <div className="detail-metric">
          <span>Risk score</span>
          <strong className={riskClass}>
            {machine.risk_score}/100
          </strong>
          <small className={riskClass}>
            {machine.risk_level} RISK
          </small>
        </div>

        <div className="detail-metric">
          <span>Downtime</span>
          <strong>
            {Number(machine.downtime_hours).toFixed(1)} h
          </strong>
          <small>{machine.failure_count} recorded failures</small>
        </div>

        <div className="detail-metric">
          <span>Latest temperature</span>
          <strong>
            {latestReading?.temperature_c != null
              ? `${Number(latestReading.temperature_c).toFixed(1)}°C`
              : "N/A"}
          </strong>
          <small>
            Peak:{" "}
            {maxTemperature != null
              ? `${maxTemperature.toFixed(1)}°C`
              : "N/A"}
          </small>
        </div>

        <div className="detail-metric">
          <span>Latest vibration</span>
          <strong>
            {latestReading?.vibration_mm_s != null
              ? `${Number(latestReading.vibration_mm_s).toFixed(2)}`
              : "N/A"}
          </strong>
          <small>
            Peak:{" "}
            {maxVibration != null
              ? `${maxVibration.toFixed(2)} mm/s`
              : "N/A"}
          </small>
        </div>

      </div>

      {loading && (
        <div className="sensor-message">
          Loading sensor history from Exasol...
        </div>
      )}

      {error && (
        <div className="sensor-error">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="sensor-section-heading">
            <div>
              <span className="section-kicker">HISTORICAL TELEMETRY</span>
              <h3>Sensor performance</h3>
            </div>

            <span className="record-count">
              {readings.length} readings · 14 days
            </span>
          </div>

          <div className="sensor-charts">

            <div className="sensor-chart-card">
              <div className="chart-heading">
                <div>
                  <h3>Temperature trend</h3>
                  <p>Temperature measured in °C</p>
                </div>
                <span className="chart-indicator temperature-indicator">
                  ● Temperature
                </span>
              </div>

              <div className="chart-area">
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 18, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="#29394d"
                      strokeDasharray="4 4"
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#8da0b5", fontSize: 10 }}
                      minTickGap={25}
                    />

                    <YAxis
                      tick={{ fill: "#8da0b5", fontSize: 10 }}
                      width={44}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#101b2a",
                        border: "1px solid #38506a",
                        borderRadius: "8px",
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#91a9c1" }}
                      formatter={(value) => [
                        value == null
                          ? "Missing"
                          : `${Number(value).toFixed(2)} °C`,
                        "Temperature",
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Temperature"
                      stroke="#f6a65d"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sensor-chart-card">
              <div className="chart-heading">
                <div>
                  <h3>Vibration trend</h3>
                  <p>Vibration measured in mm/s</p>
                </div>
                <span className="chart-indicator vibration-indicator">
                  ● Vibration
                </span>
              </div>

              <div className="chart-area">
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 12, right: 18, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="#29394d"
                      strokeDasharray="4 4"
                    />

                    <XAxis
                      dataKey="time"
                      tick={{ fill: "#8da0b5", fontSize: 10 }}
                      minTickGap={25}
                    />

                    <YAxis
                      tick={{ fill: "#8da0b5", fontSize: 10 }}
                      width={44}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#101b2a",
                        border: "1px solid #38506a",
                        borderRadius: "8px",
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#91a9c1" }}
                      formatter={(value) => [
                        value == null
                          ? "Missing"
                          : `${Number(value).toFixed(2)} mm/s`,
                        "Vibration",
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="vibration"
                      name="Vibration"
                      stroke="#54cdb9"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="sensor-data-quality">
            <span>DATA QUALITY</span>
            <strong>
              {missingRows} of {readings.length} readings contain at least
              one missing sensor value.
            </strong>
            <small>
              Missing measurements are kept as gaps, not converted to zero.
            </small>
          </div>

          <div className="recommendation-panel">
            <span className="section-kicker">MAINTENANCE RECOMMENDATION</span>
            <h3>{machine.recommended_action}</h3>
            <p>
              This recommendation is based on the configured demonstration
              scoring rules and recorded synthetic factory data.
            </p>
          </div>
        </>
      )}

    </section>
  );
}

export default MachineDetail;
