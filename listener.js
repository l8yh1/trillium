const { handle }  = require("./handler");
const { saveSettings, loadSettings } = require("./Main");
const logger = require("./logger");

// ─── Listener ────────────────────────────────────────────────────────────────
function startListener(api, settings) {

  api.listenMqtt(async (err, event) => {
    if (err) {
      logger.logSystem("Listener", `خطأ: ${err.message || err}`, "error");
      return;
    }
    if (!event) return;

    // ────────────────────────────────────────────────────────────────────────
    // 1. Incoming messages → command handler
    //    Typing indicator fires before the delay to look human
    // ────────────────────────────────────────────────────────────────────────
    if (event.type === "message" || event.type === "message_reply") {
      const typingDelay = Math.floor(Math.random() * 1700) + 800; // 800–2500 ms
      try { api.sendTypingIndicator(event.threadID); } catch (_) {}
      setTimeout(() => handle(api, event, loadSettings()), typingDelay);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Group name change → nm protection
    // ────────────────────────────────────────────────────────────────────────
    if (event.type === "event" && event.logMessageType === "log:thread-name") {
      const { threadID } = event;
      const fresh = loadSettings();
      const lock  = fresh.namelock?.[threadID];

      if (lock?.active && lock?.name) {
        const newName = event.logMessageData?.name || "";
        if (newName !== lock.name) {
          logger.logSystem("NM", `محاولة تغيير الاسم في Thread:${threadID} → استعادة: "${lock.name}"`);
          try {
            await api.setTitle(lock.name, threadID);
          } catch (e) {
            logger.logSystem("NM", `فشل استعادة الاسم: ${e.message}`, "error");
          }
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Nickname change → كنيات protection (instant restore on external change)
    // ────────────────────────────────────────────────────────────────────────
    if (event.type === "event" && event.logMessageType === "log:user-nickname") {
      const { threadID } = event;
      const fresh    = loadSettings();
      const nickConf = fresh.nicknames?.[threadID];

      if (nickConf?.active && nickConf?.nickname) {
        const changedUID = event.logMessageData?.participant_id;
        if (changedUID) {
          logger.logSystem("كنيات", `تغيير كنية خارجي في Thread:${threadID} UID:${changedUID} → استعادة`);
          try {
            await api.changeNickname(nickConf.nickname, threadID, changedUID);
          } catch (e) {
            logger.logSystem("كنيات", `فشل استعادة الكنية: ${e.message}`, "error");
          }
        }
      }
    }
  });

  logger.logSystem("Listener", "✅ جاهز للاستماع.");
}

module.exports = { startListener };
