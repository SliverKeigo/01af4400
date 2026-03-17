import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "fs";
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
  // Windows
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
    await page.setContent(`
      <html>
        <body style="margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden">
          ${svgContent.replace(/width="[^"]*"/, `width="${size}"`).replace(/height="[^"]*"/, `height="${size}"`)}
        </body>
      </html>
    `);
    await page.screenshot({ path: resolve(iconsDir, name), type: "png" });
    console.log(`Generated ${name} (${size}x${size})`);
  }

  await browser.close();
  console.log("\nDone! PNG icons generated.");
  console.log("Note: icon.icns and icon.ico need to be generated from icon.png");
  console.log("  macOS: iconutil or sips");
  console.log("  Windows: use an online converter or ImageMagick");
}

main().catch(console.error);
