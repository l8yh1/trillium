// ─── nm ─────────────────────────────────────────────────────────────────────
// Usage: /nm تفعيل [الاسم]   →  lock group name
//        /nm ايقاف           →  unlock
const { loadSettings, saveSettings } = require("../Main");

module.exports = {
  name: "nm",
  description: "قفل اسم المجموعة",
  adminOnly: true,

  async run({ api, event, args }) {
    const { threadID } = event;
    const settings = loadSettings();
    if (!settings.namelock) settings.namelock = {};

    const sub = args[0];

    // ─── تفعيل ───────────────────────────────────────────────────────────
    if (sub === "تفعيل") {
      const name = args.slice(1).join(" ").trim();
      if (!name) {
        return api.sendMessage(
          "⚠️ يُرجى تحديد اسم المجموعة.\nمثال: /nm تفعيل اسم المجموعة",
          threadID
        );
      }

      settings.namelock[threadID] = { active: true, name };
      saveSettings(settings);

      // Apply the name immediately
      try {
        await api.setTitle(name, threadID);
      } catch (_) {}

      return api.sendMessage(`✅ تم قفل اسم المجموعة على: "${name}"`, threadID);
    }

    // ─── ايقاف ───────────────────────────────────────────────────────────
    if (sub === "ايقاف") {
      if (settings.namelock[threadID]) {
        settings.namelock[threadID].active = false;
        saveSettings(settings);
      }
      return api.sendMessage("✅ تم إيقاف قفل الاسم.", threadID);
    }

    // ─── Usage ───────────────────────────────────────────────────────────
    api.sendMessage(
      "📌 الاستخدام:\n/nm تفعيل [الاسم]\n/nm ايقاف",
      threadID
    );
  },
};
