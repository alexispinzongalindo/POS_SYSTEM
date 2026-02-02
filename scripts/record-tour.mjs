import {
  getCredentials,
  getRecordingBaseUrl,
  getRecordingLang,
  ensureAuthState,
  launchRecorderContext,
  maybeConvertToMp4,
  safeGoto,
  settle,
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
    await safeGoto(page, `${baseUrl}/pos`);
    await settle(page, 12_000);

    await safeGoto(page, `${baseUrl}/pos/tables`);
    await settle(page, 10_000);

    await safeGoto(page, `${baseUrl}/pos/kitchen`);
    await settle(page, 10_000);

    await safeGoto(page, `${baseUrl}/pos/history`);
    await settle(page, 10_000);

    await safeGoto(page, `${baseUrl}/admin`);
    await settle(page, 8_000);

    await safeGoto(page, `${baseUrl}/admin/reports`);
    await settle(page, 8_000);

    await safeGoto(page, `${baseUrl}/admin/inventory`);
    await settle(page, 8_000);

    await safeGoto(page, `${baseUrl}/admin/support`);
    await settle(page, 8_000);

    await safeGoto(page, `${baseUrl}/admin/training`);
    await settle(page, 8_000);
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
