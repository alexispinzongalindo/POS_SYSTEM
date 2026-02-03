import {
  getCredentials,
  getRecordingBaseUrl,
  getRecordingLang,
  ensureAuthState,
  launchRecorderContext,
  maybeConvertToMp4,
  gotoTourStep,
} from "./record-utils.mjs";

async function run() {
  const baseUrl = getRecordingBaseUrl();
  const lang = getRecordingLang();
  const { email, password } = getCredentials();

  const storageState = await ensureAuthState({ lang, baseUrl, email, password });

  const { browser, context, page } = await launchRecorderContext({
    lang,
    label: `tour-${lang}`,
    storageState,
  });
  const video = page.video();

  try {
    await gotoTourStep(page, {
      url: `${baseUrl}/pos`,
      readySelector: '[data-tour="pos.tables"]',
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/pos/tables`,
      h1Text: "Tables",
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/pos/kitchen`,
      h1Text: "Kitchen Display",
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/pos/history`,
      h1Text: "Order History",
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/admin`,
      h1Text: "Admin",
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/admin/reports`,
      h1Text: "Reports",
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/admin/inventory`,
      h1Text: "Inventory",
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/admin/support`,
      timeoutMs: 120_000,
      holdMs: 20_000,
      retries: 1,
    });

    await gotoTourStep(page, {
      url: `${baseUrl}/admin/training`,
      h1Text: "Training",
      holdMs: 20_000,
      retries: 1,
    });
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
  process.stderr.write(`\nRecord tour failed: ${msg}\n`);
  process.exit(1);
});
