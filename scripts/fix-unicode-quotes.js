/**
 * Replace Unicode/smart quotes (U+2018, U+2019) with ASCII single quote in JS/JSX source.
 * Run: node scripts/fix-unicode-quotes.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat?.isDirectory()) results = results.concat(walk(full));
    else if (/\.(jsx?|tsx?)$/.test(file)) results.push(full);
  }
  return results;
}

const files = walk(srcDir);
let total = 0;
for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  s = s.replace(/\u2018/g, "'").replace(/\u2019/g, "'");
  if (s !== before) {
    fs.writeFileSync(file, s);
    total++;
    console.log("Fixed:", path.relative(process.cwd(), file));
  }
}
console.log("Done. Fixed", total, "files.");
