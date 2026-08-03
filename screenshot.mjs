import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "/private/tmp/claude-501/-Users-shaikrish-Desktop-Code-TapAway/2c543a0c-3f66-4541-9d4c-440d53ee21b2/scratchpad/hero.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto(url, { waitUntil: "networkidle" });
const hero = page.locator("section").first();
await hero.screenshot({ path: out });
await browser.close();
console.log("saved", out);
