// Derived values for the PAD file (spec: specs/005-pad-file/). Everything
// here is computed from the site's single data source — no network access,
// no second manually maintained copy (research R6/R7, data-model §6).
//
// Exports a function (canonical Eleventy JS-data shape): Eleventy calls it
// and uses the returned object, which sidesteps the unreliable CJS→ESM
// named-export hoisting that a plain `module.exports = {…}` is subject to.
const fs = require("fs");
const path = require("path");

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, relative), "utf8"));
}

module.exports = function () {
  const site = readJson("site.json");
  const en = readJson(path.join("i18n", "en.json"));

  // "YYYY-MM-DD" — the format itself is gated by the releaseDate filter.
  const [releaseYear, releaseMonth, releaseDay] = site.releaseDate.split("-");

  const bytes = site.installerSizeBytes;

  // Author name split for Contact_Info: first word is the first name, the
  // rest is the last name (contracts/pad-file.md).
  const nameParts = String(site.author.name).trim().split(/\s+/);

  // Program_Change_Info: the English "What's New" entry titles, in numeric
  // order — titles are plain-text keys (only entry *texts* carry markup).
  const changeInfo = Object.keys(en.whatsNew)
    .map((key) => /^entry(\d+)Title$/.exec(key))
    .filter(Boolean)
    .sort((a, b) => Number(a[1]) - Number(b[1]))
    .map((match) => en.whatsNew[match[0]])
    .join("; ");

  return {
    releaseYear,
    releaseMonth,
    releaseDay,
    fileSizeBytes: bytes,
    fileSizeK: Math.round(bytes / 1024),
    fileSizeMB: (bytes / 1048576).toFixed(2),
    authorFirstName: nameParts[0] || "",
    authorLastName: nameParts.slice(1).join(" "),
    changeInfo,
  };
};
