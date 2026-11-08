// Gallery viewer (spec: specs/007-release-news-gallery/).
//
// PhotoSwipe 5, self-hosted under js/vendor/photoswipe (MIT). Loaded by
// main.js only on pages that have pictures to enlarge; main.js holds clicks
// until this module has run, so a picture always opens in the viewer. Only
// without this module (no scripting, no module support) does a link open the
// picture in a tab.
//
// Every picture carries its title and caption inside the viewer, including in
// full screen, because the caption is part of PhotoSwipe's own interface.
//
// The gallery and the "What's new" showcase (spec 012) get a lightbox each,
// so the arrows page only through the pictures of the set that was opened.
import PhotoSwipeLightbox from "/js/vendor/photoswipe/photoswipe-lightbox.esm.min.js";

const strings = document.querySelector("[data-gallery-strings]").dataset;

function openLightbox(gallery, children) {
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    children,
    pswpModule: () => import("/js/vendor/photoswipe/photoswipe.esm.min.js"),
    bgOpacity: 0.94,
    padding: { top: 24, bottom: 96, left: 24, right: 24 },
    errorMsg: strings.errorMsg,
    closeTitle: strings.closeTitle,
    zoomTitle: strings.zoomTitle,
    arrowPrevTitle: strings.prevTitle,
    arrowNextTitle: strings.nextTitle,
    indexIndicatorSep: " / ",
  });

  // A hidden card (the variant of the other theme) must not become a slide.
  lightbox.addFilter("domItemData", (itemData, element) => {
    itemData.title = element.dataset.pswpTitle || "";
    itemData.caption = element.dataset.pswpCaption || "";
    return itemData;
  });

  lightbox.on("uiRegister", () => {
    const { pswp } = lightbox;

    // Title and caption, always visible — in full screen too.
    pswp.ui.registerElement({
      name: "gallery-caption",
      order: 9,
      isButton: false,
      appendTo: "root",
      html: '<strong class="pswp-caption__title"></strong><span class="pswp-caption__text"></span>',
      onInit: (el) => {
        const title = el.querySelector(".pswp-caption__title");
        const text = el.querySelector(".pswp-caption__text");
        pswp.on("change", () => {
          title.textContent = pswp.currSlide.data.title || "";
          text.textContent = pswp.currSlide.data.caption || "";
        });
      },
    });

    // Full screen: PhotoSwipe has no button of its own for it.
    if (document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen) {
      pswp.ui.registerElement({
        name: "fullscreen",
        order: 8,
        isButton: true,
        title: strings.fullscreenTitle,
        html:
          '<svg class="pswp__icn" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
          '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        onClick: () => {
          const root = pswp.element;
          const active = document.fullscreenElement || document.webkitFullscreenElement;
          if (active) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          } else {
            (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
          }
        },
      });
    }
  });

  lightbox.init();
}

if (document.querySelector("[data-gallery]")) openLightbox("[data-gallery]", "a.gallery-link");
if (document.querySelector("[data-showcase]")) openLightbox("[data-showcase]", "a[data-pswp-width]");
// release history: every release's pictures are a set of their own
if (document.querySelector("[data-release-shots]")) openLightbox("[data-release-shots]", "a[data-pswp-width]");

// main.js held any click that came before the viewer existed; replay it now.
window.tcViewerReady = true;
const pending = window.tcViewerPending;
window.tcViewerPending = null;
if (pending) pending.click();
