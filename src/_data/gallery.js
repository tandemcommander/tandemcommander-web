// Feature gallery for the templates (spec: specs/007-release-news-gallery/).
// The scene catalog (content/gallery/scenes.json) and the capture manifest
// (content/gallery/captures.json, written only by npm run shots) are loaded and
// validated in lib/content.js; anything invalid throws here and fails the
// build. Until the first capture run there is no manifest, and the gallery
// renders as empty — the site still builds.
//
// Exports a function (canonical Eleventy JS-data shape, see installer.js).
const { loadGallery } = require("../../lib/content.js");

module.exports = function () {
  const gallery = loadGallery();
  return {
    // every published scene, in catalog order — they all live on the home page
    items: gallery.hasCaptures ? gallery.published : [],
    count: gallery.hasCaptures ? gallery.published.length : 0,
    // false while no images exist: sections and links stay out of the pages
    ready: gallery.hasCaptures,
  };
};
