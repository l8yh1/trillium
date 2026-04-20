const login  = require("shadowx-fca");
const fs     = require("fs");
const path   = require("path");
const https  = require("https");
const logger = require("./logger");

// ─── Paths ───────────────────────────────────────────────────────────────────
const APPSTATE_PATH = path.join(__dirname, "appstate.json");
const ALT_PATH      = path.join(__dirname, "alt.json");
const SETTINGS_PATH = path.join(__dirname, "settings.json");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function loadSettings() {
  return loadJSON(SETTINGS_PATH) || {};
}

function saveSettings(settings) {
  saveJSON(SETTINGS_PATH, settings);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function httpsGet(url) {
  try {
    https.get(url, (res) => res.resume()).on("error", () => {});
  } catch (_) {}
}

// ─── AppState Normalizer ──────────────────────────────────────────────────────
// shadowx-fca requires { key, value, domain, path, expires }
// Most export tools (EditThisCookie, J2TEAM, etc.) export { name } not { key }
// Some also use numeric unix expires instead of a date string — we fix both.
function normalizeAppState(raw) {
  if (!Array.isArray(raw)) return raw;
  return raw.map((c) => {
    const out = Object.assign({}, c);

    // name → key  (keep both so nothing breaks internally)
    if (!out.key  && out.name) out.key  = out.name;
    if (!out.name && out.key)  out.name = out.key;

    // Ensure domain and path exist
    if (!out.domain) out.domain = ".facebook.com";
    if (!out.path)   out.path   = "/";

    // Numeric unix-timestamp → cookie date string
    if (typeof out.expires === "number") {
      out.expires = new Date(out.expires * 1000).toUTCString();
    }
    // Missing or session-only → far future
    if (!out.expires || out.expires === "Session") {
      out.expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    }

    return out;
  });
}

// Quick sanity-check before handing off to shadowx-fca
function validateAppState(state) {
  return Array.isArray(state) &&
    state.some((c) => c.key === "c_user" || c.name === "c_user");
}

// ─── Protection System 1: Cookie Backup (30–100 minutes) ────────────────────
function startCookieBackup(api) {
  function scheduleBackup() {
    const delay = randInt(30, 100) * 60 * 1000;
    setTimeout(() => {
      try {
        const state = api.getAppState();
        saveJSON(APPSTATE_PATH, state);
        saveJSON(ALT_PATH, state);
        logger.logSystem("Protection-1", "✅ تم حفظ الكوكيز احتياطياً.");
      } catch (e) {
        logger.logSystem("Protection-1", `فشل حفظ الكوكيز: ${e.message}`, "error");
      }
      scheduleBackup();
    }, delay);
  }
  scheduleBackup();
  logger.logSystem("Protection-1", "نظام النسخ الاحتياطي للكوكيز يعمل.");
}

// ─── Protection System 2: Visit friends/notifications (15–120 minutes) ──────
function startSiteVisitor() {
  const targets = [
    "https://www.facebook.com/notifications",
    "https://www.facebook.com/friends",
    "https://www.facebook.com/",
  ];

  function scheduleVisit() {
    const delay = randInt(15, 120) * 60 * 1000;
    setTimeout(() => {
      const url = targets[randInt(0, targets.length - 1)];
      httpsGet(url);
      logger.logSystem("Protection-2", `🔗 زيارة: ${url}`);
      scheduleVisit();
    }, delay);
  }
  scheduleVisit();
  logger.logSystem("Protection-2", "نظام زيارة المواقع يعمل.");
}

// ─── Protection System 3: Auto-ping Facebook (10–25 minutes) ────────────────
function startAutoPing() {
  function schedulePing() {
    const delay = randInt(10, 25) * 60 * 1000;
    setTimeout(() => {
      httpsGet("https://www.facebook.com/");
      logger.logSystem("Protection-3", "📡 Ping → facebook.com");
      schedulePing();
    }, delay);
  }
  schedulePing();
  logger.logSystem("Protection-3", "نظام Auto-Ping يعمل.");
}

// ─── Motor Scheduler ─────────────────────────────────────────────────────────
const motorTimers = {};

function startMotorForThread(api, settings, threadID) {
  const conf = settings.motor?.[threadID];
  if (!conf || !conf.active || !conf.message || !conf.interval) return;

  if (motorTimers[threadID]) {
    clearInterval(motorTimers[threadID]);
    delete motorTimers[threadID];
  }

  motorTimers[threadID] = setInterval(() => {
    api.sendMessage(conf.message, threadID, (err) => {
      if (err) logger.logSystem("Motor", `خطأ إرسال رسالة (${threadID}): ${err.message}`, "error");
      else     logger.logSystem("Motor", `إرسال تلقائي → Thread:${threadID}`);
    });
  }, conf.interval);

  logger.logSystem("Motor", `تم تشغيل المحرك للمحادثة ${threadID}`);
}

function stopMotorForThread(threadID) {
  if (motorTimers[threadID]) {
    clearInterval(motorTimers[threadID]);
    delete motorTimers[threadID];
  }
}

// ─── Nickname Rotator ────────────────────────────────────────────────────────
const nicknameTimers = {};

function startNicknameRotatorForThread(api, settings, threadID) {
  const conf = settings.nicknames?.[threadID];
  if (!conf || !conf.active || !conf.nickname || !conf.interval) return;

  if (nicknameTimers[threadID]) {
    clearInterval(nicknameTimers[threadID]);
    delete nicknameTimers[threadID];
  }

  nicknameTimers[threadID] = setInterval(async () => {
    try {
      const info = await new Promise((res, rej) =>
        api.getThreadInfo(threadID, (e, d) => (e ? rej(e) : res(d)))
      );
      const participants = info.participantIDs || [];
      if (!participants.length) return;

      const uid = participants[randInt(0, participants.length - 1)];
      await api.changeNickname(conf.nickname, threadID, uid);
      logger.logSystem("كنيات", `تغيير كنية → UID:${uid} Thread:${threadID}`);
    } catch (e) {
      logger.logSystem("كنيات", `خطأ (${threadID}): ${e.message}`, "error");
    }
  }, conf.interval);

  logger.logSystem("كنيات", `تم تشغيل الدوّار للمحادثة ${threadID}`);
}

function stopNicknameRotatorForThread(threadID) {
  if (nicknameTimers[threadID]) {
    clearInterval(nicknameTimers[threadID]);
    delete nicknameTimers[threadID];
  }
}

// ─── Bot Entry Point ─────────────────────────────────────────────────────────
function startBot() {
  logger.logDivider();
  logger.logSystem("Main", "🚀 تشغيل البوت...");

  let appState = loadJSON(APPSTATE_PATH);

  if (!appState || !appState.length) {
    logger.logSystem("Main", "appstate.json فارغ — محاولة استعادة من alt.json...", "warn");
    appState = loadJSON(ALT_PATH);
  }

  if (!appState || !appState.length) {
    logger.logSystem("Main", "❌ لا توجد كوكيز صالحة. يُرجى ملء appstate.json وإعادة التشغيل.", "error");
    process.exit(1);
  }

  // ── Normalize + validate before handing off to shadowx-fca ─────────────
  appState = normalizeAppState(appState);

  if (!validateAppState(appState)) {
    logger.logSystem("Main", "❌ الكوكيز لا تحتوي على c_user — تحقق من صحة ملف appstate.json.", "error");
    logger.logSystem("Main", `   الحقول الموجودة: ${appState.slice(0,3).map(c=>c.key||c.name).join(', ')} ...`, "error");
    process.exit(1);
  }

  logger.logSystem("Main", `🍪 تم تحميل ${appState.length} كوكي — c_user موجودة ✔`);

  const settings = loadSettings();

  login({ appState }, { forceLogin: true, listenEvents: true }, (err, api) => {
    if (err) {
      logger.logSystem("Main", `فشل تسجيل الدخول: ${err.message || err}`, "error");
      const altRaw = loadJSON(ALT_PATH);
      if (altRaw && altRaw.length) {
        const alt = normalizeAppState(altRaw);
        if (validateAppState(alt)) {
          logger.logSystem("Main", "إعادة المحاولة بكوكيز alt.json...", "warn");
          saveJSON(APPSTATE_PATH, alt);
          return setTimeout(startBot, 5000);
        }
      }
      return process.exit(1);
    }

    logger.logSystem("Main", "✅ تم تسجيل الدخول بنجاح.");

    saveJSON(APPSTATE_PATH, api.getAppState());
    saveJSON(ALT_PATH,      api.getAppState());

    // Expose globals for commands
    global.api           = api;
    global.saveSettings  = saveSettings;
    global.loadSettings  = loadSettings;
    global.startMotorForThread           = (tid) => startMotorForThread(api, loadSettings(), tid);
    global.stopMotorForThread            = stopMotorForThread;
    global.startNicknameRotatorForThread = (tid) => startNicknameRotatorForThread(api, loadSettings(), tid);
    global.stopNicknameRotatorForThread  = stopNicknameRotatorForThread;

    // Start protection systems
    startCookieBackup(api);
    startSiteVisitor();
    startAutoPing();

    // Resume active motors
    if (settings.motor) {
      Object.keys(settings.motor).forEach((tid) => {
        if (settings.motor[tid].active) startMotorForThread(api, settings, tid);
      });
    }

    // Resume active nickname rotators
    if (settings.nicknames) {
      Object.keys(settings.nicknames).forEach((tid) => {
        if (settings.nicknames[tid].active) startNicknameRotatorForThread(api, settings, tid);
      });
    }

    const admins = (settings.admins || []).length;
    logger.logSystem("Main", `📋 الإعدادات — المشرفون: ${admins} | القفل: ${settings.locked ? "مقفل 🔒" : "مفتوح 🔓"}`);
    logger.logDivider();

    const { startListener } = require("./listener");
    startListener(api, settings);
  });
}

module.exports = { saveSettings, loadSettings };
startBot();
