// scripts/patch-news.js
const fs = require("fs");
const path = require("path");

const dest = path.join(__dirname, "..", "src", "components", "News.js");
const bak = dest + ".bak";

try {
  if (fs.existsSync(bak)) {
    // restore backup to dest (overwrite)
    fs.copyFileSync(bak, dest);
    console.log("Restored", dest, "from", bak);
    process.exit(0);
  }

  // If no backup exists, print instructions so user can paste the fixed file.
  console.error("No backup found at", bak);
  console.error("Please manually overwrite", dest, "with the fixed component.");
  console.error("I can paste the full corrected `src/components/News.js` content for you to copy.");
  process.exit(2);
} catch (err) {
  console.error("Failed to run patch script:", err);
  process.exit(1);
}