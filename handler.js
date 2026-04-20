const fs      = require("fs");
const path    = require("path");
const logger  = require("./logger");

const commands = new Map();

// ─── Load all commands ───────────────────────────────────────────────────────
const commandsDir = path.join(__dirname, "commands");
fs.readdirSync(commandsDir)
  .filter((f) => f.endsWith(".js"))
  .forEach((file) => {
    try {
      const cmd = require(path.join(commandsDir, file));
      if (cmd.name) {
        if (Array.isArray(cmd.name)) {
          cmd.name.forEach((n) => commands.set(n, cmd));
        } else {
          commands.set(cmd.name, cmd);
        }
      }
    } catch (e) {
      logger.logSystem("Handler", `فشل تحميل الأمر ${file}: ${e.message}`, "error");
    }
  });

logger.logSystem("Handler", `تم تحميل ${commands.size} أمر.`);

// ─── Wrap api.sendMessage to intercept + log all bot replies ─────────────────
function wrapApi(api, threadID) {
  return new Proxy(api, {
    get(target, prop) {
      if (prop === "sendMessage") {
        return (msg, tid, callback) => {
          const logTid = tid || threadID;
          const text =
            typeof msg === "string"
              ? msg
              : msg?.body
              ? msg.body
              : msg?.attachment
              ? "[attachment/sticker]"
              : JSON.stringify(msg);
          logger.logReply({ threadID: logTid, message: text });
          return target.sendMessage(msg, tid, callback);
        };
      }
      return target[prop];
    },
  });
}

// ─── Main handler ────────────────────────────────────────────────────────────
async function handle(api, event, settings) {
  try {
    if (!event || event.type !== "message") return;

    const { threadID, senderID, body = "" } = event;
    const prefix = settings.prefix || "/";

    // Reload settings fresh to catch live changes (lock, admins, etc.)
    const fresh   = global.loadSettings();
    const admins  = fresh.admins || [];
    const isAdmin = admins.includes(String(senderID));

    // ── Log every incoming message ────────────────────────────────────────
    logger.logMessage({ senderID, threadID, body, isAdmin });

    // ── Global lock check ─────────────────────────────────────────────────
    // fresh.locked is a single boolean — applies to ALL threads at once
    if (fresh.locked && !isAdmin) return;

    // ── Prefix check ──────────────────────────────────────────────────────
    if (!body.startsWith(prefix)) return;

    const args        = body.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const cmd = commands.get(commandName);
    if (!cmd) return;

    // ── Log the command ───────────────────────────────────────────────────
    logger.logCommand({ senderID, threadID, commandName, args: [...args], isAdmin });

    // ── Admin-only guard ──────────────────────────────────────────────────
    if (cmd.adminOnly && !isAdmin) {
      const wrappedApi = wrapApi(api, threadID);
      return wrappedApi.sendMessage("⛔ هذا الأمر للمشرفين فقط.", threadID);
    }

    // ── Execute with wrapped api so replies are logged ────────────────────
    const wrappedApi = wrapApi(api, threadID);
    await cmd.run({ api: wrappedApi, event, args, settings: fresh, commands });

  } catch (err) {
    logger.logSystem("Handler", `خطأ أثناء تنفيذ الأمر: ${err.message}`, "error");
  }
}

module.exports = { handle, commands };
