// ─── كنيات ────────────────────────────────────────────────────────────────────
// Usage: /كنيات تفعيل [الكنية]   →  enable nickname protection + rotation
//        /كنيات ايقاف            →  stop immediately (even mid-cycle)
//        /كنيات وقت [الوقت]      →  change rotation interval
const { loadSettings, saveSettings } = require("../Main");

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
  name: "كنيات",
  description: "يحمي كنى الأعضاء ويطبقها تلقائياً",
  adminOnly: true,

  async run({ api, event, args }) {
    const { threadID } = event;
    const settings = loadSettings();
    if (!settings.nicknames) settings.nicknames = {};
    if (!settings.nicknames[threadID]) settings.nicknames[threadID] = {};

    const conf = settings.nicknames[threadID];
    const sub  = args[0];

    // ─── تفعيل ────────────────────────────────────────────────────────────
    if (sub === "تفعيل") {
      const nickname = args.slice(1).join(" ").trim();
      if (!nickname) {
        return api.sendMessage(
          "⚠️ يُرجى كتابة الكنية: /كنيات تفعيل [الكنية]",
          threadID
        );
      }

      conf.nickname = nickname;
      conf.active   = true;
      // Default interval 5 minutes if not set
      if (!conf.interval) conf.interval = 5 * 60 * 1000;
      saveSettings(settings);

      // Stop any existing rotator first, then restart
      global.stopNicknameRotatorForThread(threadID);
      global.startNicknameRotatorForThread(threadID);

      const display = conf.interval >= 60000
        ? `${(conf.interval / 60000).toFixed(1)} دقيقة`
        : `${(conf.interval / 1000).toFixed(0)} ثانية`;

      return api.sendMessage(
        `✅ تم تفعيل حماية الكنيات!\n🏷️ الكنية: "${nickname}"\n⏱️ التغيير كل: ${display}`,
        threadID
      );
    }

    // ─── ايقاف ────────────────────────────────────────────────────────────
    if (sub === "ايقاف") {
      // Immediately stop – even if mid-changing
      conf.active = false;
      saveSettings(settings);
      global.stopNicknameRotatorForThread(threadID);
      return api.sendMessage("✅ تم إيقاف حماية الكنيات فوراً.", threadID);
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

      // Restart rotator with new interval if active
      if (conf.active) {
        global.stopNicknameRotatorForThread(threadID);
        global.startNicknameRotatorForThread(threadID);
      }

      const display = ms >= 60000
        ? `${(ms / 60000).toFixed(1)} دقيقة`
        : `${(ms / 1000).toFixed(0)} ثانية`;

      return api.sendMessage(`✅ تم تحديث فترة التغيير إلى: ${display}`, threadID);
    }

    // ─── Usage ────────────────────────────────────────────────────────────
    api.sendMessage(
      [
        "📌 استخدام كنيات:",
        "/كنيات تفعيل [الكنية]   — تفعيل الحماية",
        "/كنيات ايقاف            — إيقاف فوري",
        "/كنيات وقت [الوقت]      — تغيير الفترة (مثال: 30s أو 2m)",
      ].join("\n"),
      threadID
    );
  },
};
