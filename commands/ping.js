// ─── بينغ ────────────────────────────────────────────────────────────────────
module.exports = {
  name: "بينغ",
  description: "يقيس سرعة استجابة البوت",
  adminOnly: false,

  async run({ api, event }) {
    const start = Date.now();
    api.sendMessage("🏓 بينغ...", event.threadID, (err, info) => {
      if (err) return;
      const ping = Date.now() - start;
      api.editMessage(`🏓 بونغ! السرعة: ${ping}ms`, info.messageID);
    });
  },
};
