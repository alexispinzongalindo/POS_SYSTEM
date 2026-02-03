import {
  getCredentials,
  getRecordingBaseUrl,
  getRecordingLang,
  launchRecorderContext,
  login,
  maybeConvertToMp4,
  gotoTourStep,
} from "./record-utils.mjs";

async function run() {
  const baseUrl = getRecordingBaseUrl();
  const lang = getRecordingLang();
  const { email, password } = getCredentials();

  const { browser, context, page } = await launchRecorderContext({ lang, label: `training-${lang}` });
  const video = page.video();

  try {
    await login(page, { baseUrl, email, password });

    await gotoTourStep(page, { url: `${baseUrl}/admin`, h1Text: "Admin", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/admin/floor`, h1Text: "Floor Plan", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/admin/orders`, h1Text: "Orders", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/admin/reports`, h1Text: "Reports", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/admin/inventory`, h1Text: "Inventory", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/admin/reservations`, h1Text: "Reservations", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/admin/staff`, h1Text: "Staff", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, {
      url: `${baseUrl}/admin/support`,
      timeoutMs: 120_000,
      holdMs: 6_000,
      retries: 1,
    });
    await gotoTourStep(page, { url: `${baseUrl}/admin/training`, h1Text: "Training", holdMs: 6_000, retries: 1 });

    await gotoTourStep(page, { url: `${baseUrl}/pos`, readySelector: '[data-tour="pos.tables"]', holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/pos/tables`, h1Text: "Tables", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/pos/kitchen`, h1Text: "Kitchen Display", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/pos/history`, h1Text: "Order History", holdMs: 6_000, retries: 1 });
    await gotoTourStep(page, { url: `${baseUrl}/pos/offline`, h1Text: "Offline Queue Manager", holdMs: 6_000, retries: 1 });
  } finally {
    await context.close();
    await browser.close();

    const finalPath = video ? await video.path().catch(() => null) : null;
    if (finalPath) {
      process.stdout.write(`\nRECORDED_VIDEO=${finalPath}\n`);
      const mp4 = await maybeConvertToMp4(finalPath);
      if (mp4 && mp4 !== finalPath) process.stdout.write(`RECORDED_MP4=${mp4}\n`);
    } else {
      process.stdout.write("\nRECORDED_VIDEO=UNKNOWN (video path not available)\n");
    }
  }
}

run().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`\nRecord training failed: ${msg}\n`);
  process.exit(1);
});
