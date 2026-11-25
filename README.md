# Aevum Capital website

The Aevum Capital site is static, multi-page, and has no build step at deploy time. All content comes from aevumcapital.llc. The brand colors are carried over from that site: navy `#0B1F3A`, gold `#C9A74A`, and cream `#F7F6F3`, with Playfair Display used for accents. The layout follows the light, glassy, isometric style of ehpinc.com.

## Pages
| Path | Source | 3D hero |
|---|---|---|
| `/` | `_src/pages/index.html` | gold four-point star (the logo mark) |
| `/life-insurance/` | `_src/pages/life-insurance.html` | shield |
| `/life-settlements/` | `_src/pages/life-settlements.html` | policy stack and seal |
| `/about/` | `_src/pages/about.html` | three columns |
| `/contact/` | `_src/pages/contact.html` | none |

## Editing
Every page shares one header and footer, kept in `_src/shell.html`. To change a page:

1. Edit its file in `_src/pages/`.
2. Run `python3 tools/build.py`.

The build writes the five `index.html` files that get deployed. Don't hand-edit the generated `index.html` files, because the next build overwrites them.

## Preview locally
```
python3 -m http.server 8765
```
Then open http://localhost:8765.

## How it works
- `assets/js/hero3d.js` builds the isometric hero scene with Three.js r165, loaded as an ES module through the import map. The canvas is transparent and there's no post-processing. Rendering pauses when the hero is offscreen or the tab is hidden, and the scene draws a single static frame when the visitor has reduced motion turned on.
- `assets/js/viz.js` draws the finance visualizations:
  - value ladder
  - uncorrelated-signal chart
  - policy-portfolio maturities
  - lapse grid
  - lifecycle track
  - policy math explorer
  - coverage-over-time chart
  - IUL floor chart
  - gold star particle field

  Every chart is a conceptual illustration and is labeled that way on the page.
- `assets/js/site.js` handles Lenis smooth scroll, GSAP and ScrollTrigger reveals, the rolling-letter buttons, the counters, and the contact form. The form opens the visitor's email app with the inquiry pre-filled and addressed to chris@aevumcapital.llc.
- The CDN libraries are pinned:
  - GSAP 3.12.5 (cdnjs)
  - Lenis 1.1.13 (jsdelivr)
  - Three 0.165.0 (jsdelivr)

  If GSAP or Lenis fails to load, the page stays fully readable.

## Compliance notes
The disclosures from the original site are kept word for word.

The policy math explorer on `/life-settlements/` is new. It does simple arithmetic for one hypothetical policy and shows a prominent disclaimer, but it should still be reviewed by Aevum's compliance or counsel before launch.
