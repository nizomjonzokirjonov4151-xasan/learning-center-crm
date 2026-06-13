export async function register() {
  // Only run in Node.js runtime (not Edge), and not during build
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleDailyReport } = await import("./lib/cron");
    scheduleDailyReport();
  }
}
