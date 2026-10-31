
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Common function for sending GET requests.
 */
async function request(endpoint) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Check whether FastAPI and Exasol are available.
 */
export function getHealth() {
  return request("/api/health");
}

/**
 * Retrieve all registered machines.
 */
export function getMachines() {
  return request("/api/machines");
}

/**
 * Retrieve explainable machine-risk scores.
 */
export function getRiskScores() {
  return request("/api/risk-scores");
}

/**
 * Retrieve historical sensor readings for a selected machine.
 */
export function getMachineSensors(machineId) {
  return request(
    `/api/machines/${encodeURIComponent(machineId)}/sensors`
  );
}


/**
 * Retrieve downtime summary, plant breakdown,
 * failure categories and individual downtime events.
 */
export function getDowntimeAnalytics() {
  return request("/api/downtime");
}


/**
 * Retrieve maintenance summary, pending tasks
 * and maintenance history.
 */
export function getMaintenanceAnalytics() {
  return request("/api/maintenance");
}
