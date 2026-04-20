// ─── سيرفر ────────────────────────────────────────────────────────────────────
const os = require("os");

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}ي ${h}س ${m}د ${s}ث`;
}

function formatBytes(bytes) {
  const gb = bytes / 1024 / 1024 / 1024;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

module.exports = {
  name: "سيرفر",
  description: "يعرض معلومات السيرفر",
  adminOnly: false,

  async run({ api, event }) {
    const totalMem   = os.totalmem();
    const freeMem    = os.freemem();
    const usedMem    = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    const cpus       = os.cpus();
    const cpuModel   = cpus[0]?.model?.trim() || "غير معروف";
    const cpuCores   = cpus.length;

    // Simple CPU usage estimate via load average (1-min)
    const load1m   = os.loadavg()[0];
    const cpuUsage = Math.min(((load1m / cpuCores) * 100).toFixed(1), 100);

    const uptime    = os.uptime();
    const botUptime = process.uptime();
    const platform  = `${os.type()} ${os.release()} (${os.arch()})`;

    const msg = [
      "╔══════════════════════╗",
      "║   📊 معلومات السيرفر   ║",
      "╚══════════════════════╝",
      "",
      `🖥️  النظام   : ${platform}`,
      `⚙️  المعالج  : ${cpuModel}`,
      `🔢  الأنوية  : ${cpuCores} أنوية`,
      `📈  الحمل    : ${cpuUsage}%`,
      "",
      `💾  الذاكرة  : ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memPercent}%)`,
      "",
      `⏱️  وقت تشغيل السيرفر : ${formatUptime(uptime)}`,
      `🤖  وقت تشغيل البوت   : ${formatUptime(botUptime)}`,
      "",
      `📦  Node.js : ${process.version}`,
    ].join("\n");

    api.sendMessage(msg, event.threadID);
  },
};
