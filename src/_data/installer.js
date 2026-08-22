// Single source for the installer artifact's name and download location
// (spec: specs/005-pad-file/). Consumed by the download section and the PAD
// file — they must never disagree, so nothing else may rebuild these strings.
//
// Exports a function (canonical Eleventy JS-data shape): Eleventy calls it
// and uses the returned object, which sidesteps the unreliable CJS→ESM
// named-export hoisting that a plain `module.exports = {…}` is subject to.
const fs = require("fs");
const path = require("path");

module.exports = function () {
  const site = JSON.parse(
    fs.readFileSync(path.join(__dirname, "site.json"), "utf8")
  );
  const fileName = `tandemcommander-${site.version}-x64-setup.exe`;
  return {
    fileName,
    url: `${site.github.repoUrl}/releases/download/v${site.version}/${fileName}`,
  };
};
