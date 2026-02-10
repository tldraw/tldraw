---
name: scrape-framer-assets
description: Extract SVGs, images, and other visual assets from Framer-built websites using browser automation. Use when asked to scrape logos, icons, or images from a Framer site (like tldraw.dev), or when assets appear invisible to standard web scraping because they are rendered via CSS masks, Framer components, or dynamically loaded content.
---

# Scrape Framer assets

Framer sites render assets in non-standard ways that defeat normal scraping. This skill documents the known rendering techniques and how to extract assets from each.

## Key insight

Framer sites are heavily dynamic. `WebFetch` will only return CSS/JS boilerplate. Always use **browser automation** (chrome-devtools MCP) to navigate, scroll, and evaluate scripts on the live page.

## Asset rendering techniques

### 1. CSS mask-image SVGs (most common for logos/icons)

Framer renders SVG logos as **empty divs with CSS `mask-image`** containing a `data:image/svg+xml` URI. The div's background color shows through the mask shape.

**Detection:** Elements have no `innerHTML`, no child SVGs, but `getComputedStyle(el).webkitMaskImage` contains SVG data.

**Extraction pattern:**

```js
() => {
  const items = document.querySelectorAll('.ticker-item div, [class*="framer-"] > div');
  const seen = new Set();
  const results = [];
  for (const div of items) {
    const key = div.className.split(' ')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const mask = getComputedStyle(div).webkitMaskImage || getComputedStyle(div).maskImage || '';
    const match = mask.match(/url\("data:image\/svg\+xml,(.+?)"\)/);
    if (match) {
      let svg = decodeURIComponent(match[1]);
      svg = svg.replace(/\\"/g, '"');  // Fix escaped quotes from CSS encoding
      svg = svg.replace(/fill="var\(--[^)]+\)"/g, 'fill="currentColor"');  // Replace Framer CSS vars
      svg = svg.replace(/fill="transparent"/g, 'fill="none"');
      results.push(svg);
    }
  }
  return results;
}
```

**Critical gotcha:** The extracted SVGs will have escaped quotes (`\\\"` → `"`) that must be fixed or they won't render as inline SVGs.

### 2. Framer image components (`<IMG>` tags)

Standard `<img>` tags with `framerusercontent.com` URLs. These are straightforward but may be lazy-loaded.

**Extraction:** Scroll the full page first to trigger lazy loading, then query `document.querySelectorAll('img')`.

### 3. Blob URLs in SVG `<image>` elements

Embedded tldraw canvases use `<image href="blob:...">` elements. These are runtime-generated and cannot be downloaded by URL.

### 4. Inline SVG icons

Small UI icons (typically 24x24 viewBox) rendered as standard `<svg>` elements. Filter by viewBox to separate from logos.

## Workflow

1. **Navigate** to the page with `navigate_page`
2. **Scroll** the full page via `evaluate_script` to trigger lazy loading
3. **Locate** the target section (use `evaluate_script` to find elements by heading text, `data-framer-name`, or `.ticker-item` for carousels)
4. **Identify rendering technique** by checking: `innerHTML` content, `webkitMaskImage`, `backgroundImage`, child `<svg>` or `<img>` tags
5. **Extract** using the appropriate pattern above
6. **Preview** by injecting extracted SVGs into a temporary overlay div with `fill="black"` to visually identify each asset
7. **Save** to disk (use `evaluate_script` to return data, then write files via the Write tool or a Python/jq script for batch processing)

## Tips

- Framer ticker/carousel components duplicate items for seamless scrolling. Deduplicate by using the first CSS class name as a key.
- `data-framer-name` attributes on elements reveal component names (e.g., "Logo", "Desktop Nav", "Mobile").
- Resize the page to desktop width (1400px+) before extracting — some components are hidden at mobile breakpoints.
- If `evaluate_script` output exceeds token limits, store results in `window.__data` and retrieve in chunks, or save the overflow file and process with Python/jq.
