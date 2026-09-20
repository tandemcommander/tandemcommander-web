// Release records for the templates (spec: specs/007-release-news-gallery/).
// All logic and validation live in lib/content.js; a broken or missing record
// throws here, which fails the build — a version can never ship without its
// release content.
//
// Exports a function (canonical Eleventy JS-data shape, see installer.js).
const fs = require("fs");
const path = require("path");
const { loadReleases, loadGallery } = require("../../lib/content.js");

module.exports = function () {
  const site = JSON.parse(
    fs.readFileSync(path.join(__dirname, "site.json"), "utf8")
  );
  // Highlight → scene links are only checked (and rendered) once the gallery
  // has images; until the first capture run there is nothing to link to.
  const gallery = loadGallery();
  const publishedScenes = gallery.hasCaptures
    ? new Set(gallery.published.map((s) => s.id))
    : null;
  const releases = loadReleases(site, { publishedScenes });
  releases.linkScenes = Boolean(publishedScenes);
  return releases;
};
