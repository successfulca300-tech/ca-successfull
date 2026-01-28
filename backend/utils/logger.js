import fs from 'fs';
import path from 'path';

const logsDir = path.resolve('./logs');
const logFile = path.join(logsDir, 'server.log');

function ensureLogsDir() {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (e) {
    // ignore
  }
}

export function appendLog(message) {
  try {
    ensureLogsDir();
    const line = `${new Date().toISOString()} - ${message}\n`;
    fs.appendFileSync(logFile, line);
  } catch (e) {
    // fallback to console
    console.error('Failed to write log:', e);
  }
}

export default { appendLog };
