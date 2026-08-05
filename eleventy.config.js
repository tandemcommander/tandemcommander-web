module.exports = function (eleventyConfig) {
  // Static passthrough: everything in src/root lands at the site root,
  // the rest keeps its folder name under public/.
  eleventyConfig.addPassthroughCopy({ "src/root": "." });
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/fonts": "fonts" });
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });

  return {
    dir: {
      input: "src",
      output: "public",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk"],
  };
};
