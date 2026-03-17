import { chromium } from "@playwright/test";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const svgPath = resolve(projectRoot, "app-icon.svg");
const iconsDir = resolve(projectRoot, "src-tauri/icons");

const sizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
  { name: "Square30x30Logo.png", size: 30 },
  { name: "Square44x44Logo.png", size: 44 },
  { name: "Square71x71Logo.png", size: 71 },
  { name: "Square89x89Logo.png", size: 89 },
  { name: "Square107x107Logo.png", size: 107 },
  { name: "Square142x142Logo.png", size: 142 },
  { name: "Square150x150Logo.png", size: 150 },
  { name: "Square284x284Logo.png", size: 284 },
  { name: "Square310x310Logo.png", size: 310 },
  { name: "StoreLogo.png", size: 50 },
];

const svgContent = readFileSync(svgPath, "utf-8");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const { name, size } of sizes) {
    await page.setViewportSize({ width: size, height: size });
    // Use a transparent background (checkerboard = transparent) so the PNG has an alpha channel
    await page.setContent(`
      <html>
        <body style="margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent">
          ${svgContent.replace(/width="[^"]*"/, `width="${size}"`).replace(/height="[^"]*"/, `height="${size}"`)}
        </body>
      </html>
    `);
    // omitBackground: true ensures RGBA output with alpha channel
    await page.screenshot({
      path: resolve(iconsDir, name),
      type: "png",
      omitBackground: true,
    });
    console.log(`Generated ${name} (${size}x${size}) RGBA`);
  }

  await browser.close();
  console.log("\nDone! RGBA PNG icons generated.");
}

main().catch(console.error);
