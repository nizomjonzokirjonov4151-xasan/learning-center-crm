import cron from "node-cron";
import { sendDailyReport } from "./telegram";

let initialized = false;

export function scheduleDailyReport(): void {
  if (initialized) return;
  initialized = true;

  // Every day at 21:00 server local time
  cron.schedule("0 21 * * *", async () => {
    console.log("[Cron] Sending daily Telegram report…");
    const ok = await sendDailyReport();
    console.log(`[Cron] Daily report ${ok ? "sent ✓" : "failed ✗"}`);
  });

  console.log("[Cron] Daily Telegram report scheduled at 21:00");
}
