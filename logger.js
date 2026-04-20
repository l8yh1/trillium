// ─── logger.js ────────────────────────────────────────────────────────────────
// Logs all messages, roles, commands, and bot replies
// Output: console (colored) + logs/bot.log (plain)
// ─────────────────────────────────────────────────────────────────────────────

const fs   = require("fs");
const path = require("path");

// ── Logs directory ────────────────────────────────────────────────────────────
const LOGS_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

const LOG_FILE = path.join(LOGS_DIR, "bot.log");

// ── ANSI colors for console only ──────────────────────────────────────────────
const C = {
  reset  : "\x1b[0m",
  gray   : "\x1b[90m",
  cyan   : "\x1b[36m",
  green  : "\x1b[32m",
  yellow : "\x1b[33m",
  red    : "\x1b[31m",
  blue   : "\x1b[34m",
  magenta: "\x1b[35m",
  bold   : "\x1b[1m",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleString("en-GB", {
    year:   "numeric",
    month:  "2-digit",
    day:    "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(",", "");
}

// Write one line to both console (with color) and log file (plain)
function write(colorLine, plainLine) {
  console.log(colorLine);
  fs.appendFileSync(LOG_FILE, plainLine + "\n", "utf8");
}

// Truncate long strings for display
function trunc(str, max = 140) {
  const s = String(str ?? "").replace(/\n/g, " ↵ ");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// logMessage — called for EVERY incoming message
// ─────────────────────────────────────────────────────────────────────────────
function logMessage({ senderID, threadID, body, isAdmin }) {
  const role      = isAdmin ? "ADMIN" : "USER ";
  const roleColor = isAdmin ? C.yellow : C.cyan;
  const ts        = now();
  const text      = trunc(body);

  const colorLine =
    `${C.gray}[${ts}]${C.reset} ` +
    `${roleColor}${C.bold}[${role}]${C.reset} ` +
    `${C.gray}Thread:${C.reset}${threadID} ` +
    `${C.gray}ID:${C.reset}${senderID} ` +
    `${C.gray}»${C.reset} ${text}`;

  const plainLine =
    `[${ts}] [${role.trim()}] Thread:${threadID} | ID:${senderID} | ${text}`;

  write(colorLine, plainLine);
}

// ─────────────────────────────────────────────────────────────────────────────
// logCommand — called when a command is detected
// ─────────────────────────────────────────────────────────────────────────────
function logCommand({ senderID, threadID, commandName, args, isAdmin }) {
  const role      = isAdmin ? "ADMIN" : "USER ";
  const roleColor = isAdmin ? C.yellow : C.cyan;
  const ts        = now();
  const argsStr   = args?.length ? args.join(" ") : "—";

  const colorLine =
    `${C.gray}[${ts}]${C.reset} ` +
    `${C.magenta}${C.bold}[CMD  ]${C.reset} ` +
    `${roleColor}[${role}]${C.reset} ` +
    `${C.gray}Thread:${C.reset}${threadID} ` +
    `${C.gray}ID:${C.reset}${senderID} ` +
    `${C.bold}${C.blue}/${commandName}${C.reset} ` +
    `${C.gray}args:${C.reset}[${argsStr}]`;

  const plainLine =
    `[${ts}] [CMD  ] [${role.trim()}] Thread:${threadID} | ID:${senderID} | /${commandName} args:[${argsStr}]`;

  write(colorLine, plainLine);
}

// ─────────────────────────────────────────────────────────────────────────────
// logReply — called when the bot sends a reply
// ─────────────────────────────────────────────────────────────────────────────
function logReply({ threadID, message }) {
  const ts   = now();
  const text = trunc(message);

  const colorLine =
    `${C.gray}[${ts}]${C.reset} ` +
    `${C.green}${C.bold}[BOT  ]${C.reset} ` +
    `${C.gray}Thread:${C.reset}${threadID} ` +
    `${C.gray}«${C.reset} ${text}`;

  const plainLine =
    `[${ts}] [BOT  ] Thread:${threadID} | ${text}`;

  write(colorLine, plainLine);
}

// ─────────────────────────────────────────────────────────────────────────────
// logSystem — generic system/info/error messages
// ─────────────────────────────────────────────────────────────────────────────
function logSystem(tag, message, level = "info") {
  const ts         = now();
  const levelColor = level === "error" ? C.red : level === "warn" ? C.yellow : C.blue;
  const tagPad     = tag.slice(0, 12).padEnd(12);

  const colorLine =
    `${C.gray}[${ts}]${C.reset} ` +
    `${levelColor}${C.bold}[${tagPad}]${C.reset} ${message}`;

  const plainLine =
    `[${ts}] [${tagPad}] ${message}`;

  write(colorLine, plainLine);
}

// ─────────────────────────────────────────────────────────────────────────────
// logDivider — visual separator on startup
// ─────────────────────────────────────────────────────────────────────────────
function logDivider() {
  const line = "─".repeat(70);
  write(`${C.gray}${line}${C.reset}`, line);
}

module.exports = { logMessage, logCommand, logReply, logSystem, logDivider };
