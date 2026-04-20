// ─── قفل ─────────────────────────────────────────────────────────────────────
// Usage: /قفل تفعيل   →  lock bot globally (no one except admins can use commands)
//        /قفل ايقاف   →  unlock bot globally
//
// settings.locked is a single boolean — affects ALL threads at once.
// ─────────────────────────────────────────────────────────────────────────────
const { loadSettings, saveSettings } = require("../Main");

module.exports = {
  name: "قفل",
  description: "يقفل البوت بشكل كامل — لا يستجيب إلا للمشرفين في أي محادثة",
  adminOnly: true,

  async run({ api, event, args }) {
    const { threadID } = event;
    const settings = loadSettings();
    const sub = args[0];

    if (sub === "تفعيل") {
      if (settings.locked) {
        return api.sendMessage("⚠️ البوت مقفل مسبقاً.", threadID);
      }
      settings.locked = true;
      saveSettings(settings);
      return api.sendMessage(
        "🔒 تم قفل البوت عالمياً.\nلن يستجيب لأي شخص في أي محادثة إلا للمشرفين.",
        threadID
      );
    }

    if (sub === "ايقاف") {
      if (!settings.locked) {
        return api.sendMessage("⚠️ البوت غير مقفل أصلاً.", threadID);
      }
      settings.locked = false;
      saveSettings(settings);
      return api.sendMessage(
        "🔓 تم فتح البوت عالمياً.\nالجميع يستطيع استخدام الأوامر الآن.",
        threadID
      );
    }

    // ─── Usage ────────────────────────────────────────────────────────────
    const status = settings.locked ? "🔒 مقفل" : "🔓 مفتوح";
    api.sendMessage(
      `📌 الاستخدام:\n/قفل تفعيل   — قفل البوت عالمياً\n/قفل ايقاف   — فتح البوت\n\n📊 الحالة الحالية: ${status}`,
      threadID
    );
  },
};
