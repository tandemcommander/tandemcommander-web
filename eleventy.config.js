module.exports = function (eleventyConfig) {
  // Formats site.json's releaseDate ("YYYY-MM-DD") as e.g. "August 5, 2026".
  // Throws on a missing or invalid value so a bad config fails the build
  // instead of publishing the site without a release date.
  eleventyConfig.addFilter("releaseDate", function (value) {
    const fail = () => {
      throw new Error(
        `site.json: "releaseDate" must be a valid YYYY-MM-DD date, got ${JSON.stringify(value)}`
      );
    };
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail();
    const date = new Date(value + "T00:00:00Z");
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail();
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  });

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
