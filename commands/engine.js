// ─── محرك ─────────────────────────────────────────────────────────────────────
// Usage: /محرك رسالة [الرسالة]   →  set the message to send
//        /محرك وقت [الوقت]       →  set interval (e.g. 30s or 5m)
//        /محرك تفعيل             →  start
//        /محرك ايقاف             →  stop
const { loadSettings, saveSettings } = require("../Main");

// Parse time string: "30s" → 30000ms, "5m" → 300000ms, "60" → 60000ms
function parseTime(str) {
  if (!str) return null;
  const lower = str.toLowerCase().trim();
  if (lower.endsWith("m")) {
    const val = parseFloat(lower);
    return isNaN(val) ? null : val * 60 * 1000;
  }
  if (lower.endsWith("s")) {
    const val = parseFloat(lower);
    return isNaN(val) ? null : val * 1000;
  }
  const val = parseFloat(lower);
  return isNaN(val) ? null : val * 1000;
}

module.exports = {
  name: "محرك",
  description: "يرسل رسالة تلقائية كل فترة محددة",
  adminOnly: true,

  async run({ api, event, args }) {
    const { threadID } = event;
    const settings = loadSettings();
    if (!settings.motor) settings.motor = {};
    if (!settings.motor[threadID]) settings.motor[threadID] = {};

    const conf = settings.motor[threadID];
    const sub  = args[0];

    // ─── رسالة ────────────────────────────────────────────────────────────
    if (sub === "رسالة") {
      const msg = args.slice(1).join(" ").trim();
      if (!msg) {
        return api.sendMessage("⚠️ يُرجى كتابة الرسالة بعد: /محرك رسالة [الرسالة]", threadID);
      }
      conf.message = msg;
      saveSettings(settings);
      return api.sendMessage(`✅ تم تعيين الرسالة: "${msg}"`, threadID);
    }

    // ─── وقت ──────────────────────────────────────────────────────────────
    if (sub === "وقت") {
      const ms = parseTime(args[1]);
      if (!ms || ms < 5000) {
        return api.sendMessage(
          "⚠️ يُرجى تحديد وقت صحيح (أقل قيمة 5 ثوانٍ).\nأمثلة: 30s · 2m · 90s",
          threadID
        );
      }
      conf.interval = ms;
      saveSettings(settings);

      const display = ms >= 60000
        ? `${(ms / 60000).toFixed(1)} دقيقة`
        : `${(ms / 1000).toFixed(0)} ثانية`;
      return api.sendMessage(`✅ تم تعيين الفترة: ${display}`, threadID);
    }

    // ─── تفعيل ────────────────────────────────────────────────────────────
    if (sub === "تفعيل") {
      if (!conf.message) {
        return api.sendMessage("⚠️ يُرجى تعيين الرسالة أولاً: /محرك رسالة [الرسالة]", threadID);
      }
      if (!conf.interval) {
        return api.sendMessage("⚠️ يُرجى تعيين الوقت أولاً: /محرك وقت [الوقت]", threadID);
      }

      conf.active = true;
      saveSettings(settings);

      global.stopMotorForThread(threadID);
      global.startMotorForThread(threadID);

      const display = conf.interval >= 60000
        ? `${(conf.interval / 60000).toFixed(1)} دقيقة`
        : `${(conf.interval / 1000).toFixed(0)} ثانية`;

      return api.sendMessage(
        `✅ تم تشغيل المحرك!\n📝 الرسالة: "${conf.message}"\n⏱️ كل: ${display}`,
        threadID
      );
    }

    // ─── ايقاف ────────────────────────────────────────────────────────────
    if (sub === "ايقاف") {
      conf.active = false;
      saveSettings(settings);
      global.stopMotorForThread(threadID);
      return api.sendMessage("✅ تم إيقاف المحرك.", threadID);
    }

    // ─── Usage ────────────────────────────────────────────────────────────
    api.sendMessage(
      [
        "📌 استخدام المحرك:",
        "/محرك رسالة [الرسالة]   — تعيين الرسالة",
        "/محرك وقت [الوقت]       — تعيين الفترة (مثال: 30s أو 5m)",
        "/محرك تفعيل             — تشغيل",
        "/محرك ايقاف             — إيقاف",
      ].join("\n"),
      threadID
    );
  },
};
