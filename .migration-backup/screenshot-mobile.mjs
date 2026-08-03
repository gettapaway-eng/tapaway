import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
const hero = page.locator("section").first();
await hero.screenshot({ path: "/private/tmp/claude-501/-Users-shaikrish-Desktop-Code-TapAway/2c543a0c-3f66-4541-9d4c-440d53ee21b2/scratchpad/hero-mobile.png" });
await browser.close();
