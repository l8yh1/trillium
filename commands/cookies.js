// ─── cookie ───────────────────────────────────────────────────────────────────
// Usage: /cookie  →  save current live session cookies to appstate.json + alt.json
const fs   = require("fs");
const path = require("path");

const APPSTATE_PATH = path.join(__dirname, "..", "appstate.json");
const ALT_PATH      = path.join(__dirname, "..", "alt.json");

module.exports = {
  name: "cookie",
  description: "يحفظ الكوكيز الحالية في appstate.json و alt.json",
  adminOnly: true,

  async run({ api, event }) {
    const { threadID } = event;

    try {
      const state = api.getAppState();
      if (!state || !state.length) {
        return api.sendMessage("⚠️ تعذّر الحصول على الكوكيز الحالية.", threadID);
      }

      const json = JSON.stringify(state, null, 2);
      fs.writeFileSync(APPSTATE_PATH, json, "utf8");
      fs.writeFileSync(ALT_PATH, json, "utf8");

      api.sendMessage(
        `✅ تم تحديث الكوكيز بنجاح!\n📦 appstate.json ✔\n📦 alt.json ✔\n🍪 عدد الكوكيز: ${state.length}`,
        threadID
      );
    } catch (err) {
      api.sendMessage(`❌ فشل تحديث الكوكيز: ${err.message}`, threadID);
    }
  },
};
