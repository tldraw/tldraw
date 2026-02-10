# Website Screenshot Scripts

Two Playwright-based scripts for generating and comparing screenshots of the tldraw.dev website.

## Prerequisites

```bash
yarn install
```

Make sure your local dev server is running at `http://localhost:3002`:

```bash
yarn dev
```

## 1. Generate Screenshots (`generate-screenshots.ts`)

Takes full-page screenshots and splits them into 600px segments for reference.

### Usage

```bash
yarn screenshots [baseUrl]
```

**Examples:**

```bash
# Default: localhost:3002
yarn screenshots

# Custom URL
yarn screenshots http://localhost:3000
```

### Output

Screenshots are saved to `apps/website/_reference/` with this structure:

```
_reference/
├── {page-name}/
│   ├── desktop/
│   │   ├── tldraw-dev-{page}-desktop-1200.png      (full page)
│   │   ├── tldraw-dev-{page}-desktop-1200-1.png    (600px segment)
│   │   ├── tldraw-dev-{page}-desktop-1200-2.png
│   │   └── ...
│   ├── tablet/
│   │   └── tldraw-dev-{page}-tablet-1199-*.png
│   └── mobile/
│       └── tldraw-dev-{page}-mobile-809-*.png
```

### Viewports

- **Desktop**: 1200px width
- **Tablet**: 1199px width
- **Mobile**: 809px width

### Pages Captured

- `/` (home)
- `/careers`
- `/blog`
- `/blog/category/product`
- `/blog/engineering-imperfection-with-draw-shapes`
- `/events`
- `/partner`

To add more pages, edit the `PAGES` array in `generate-screenshots.ts`.

## 2. Compare Screenshots (`compare-screenshots.ts`)

Compares production (tldraw.dev) screenshots with localhost to identify visual differences.

### Usage

```bash
yarn compare [options] [productionUrl] [localUrl]
```

**Options:**

- `--page, -p <name>`: Compare only a specific page
- `--bbox, --crop <x,y,width,height>`: Compare only a specific region (applies to all viewports)
- `--bbox-desktop <x,y,width,height>`: Desktop-specific region (1200px viewport)
- `--bbox-tablet <x,y,width,height>`: Tablet-specific region (1199px viewport)
- `--bbox-mobile <x,y,width,height>`: Mobile-specific region (809px viewport)
- `--help, -h`: Show detailed help

**Bounding box values:**

- Use numbers for exact dimensions: `0,1000,1200,1000`
- Use `auto` for width/height to match viewport size: `0,1000,auto,1000`

**Examples:**

```bash
# Compare all pages
yarn compare

# Compare with custom URLs
yarn compare https://tldraw.dev http://localhost:3000

# Compare single page
yarn compare --page showcase

# Compare a vertical slice (auto width adapts to viewport)
yarn compare --page home --bbox 0,1000,auto,1000

# Compare viewport-specific regions
yarn compare --page pricing \
  --bbox-desktop 0,800,1200,600 \
  --bbox-tablet 0,600,1199,700 \
  --bbox-mobile 0,400,809,500

# Show all options
yarn compare --help
```

### Output

Results are saved to `.claude/skills/iterate-website-page/assets/`:

```
assets/
├── {page-name}/
│   ├── desktop/
│   │   ├── production.png      # Screenshot from production
│   │   ├── local.png           # Screenshot from localhost
│   │   ├── diff.png            # Visual diff (red = differences, gray = matches)
│   │   └── sidebyside.png      # Side-by-side: production (left) vs local (right)
│   ├── tablet/
│   └── mobile/
├── comparison-report.json      # Structured JSON report
└── summary.md                  # Human-readable markdown summary
```

### Understanding Results

The script outputs:

- **Pixel difference**: Number of pixels that differ
- **Percent difference**: Percentage of total pixels that differ
- **Size differences**: Height/width mismatches

**Difference levels:**

- ✅ **< 1%**: Perfect match or trivial differences
- ⚠️ **1-5%**: Minor differences (may be acceptable)
- ❌ **> 5%**: Major differences (needs attention)

### Visual Diffs

**`diff.png`**: Shows exactly where differences occur

- **Red pixels**: Areas that differ between production and local
- **Grayscale**: Areas that match

**`sidebyside.png`**: Production (left) vs Local (right) for easy comparison. Canvas height matches the tallest of the two images.

### Available Pages

To see all available pages for comparison:

```bash
# This will show an error with the list
yarn compare https://tldraw.dev http://localhost:3002 invalid-page-name
```

Current pages:

- `home`
- `careers`
- `blog`
- `blog-category-product`
- `blog-article-engineering-imperfection`
- `events`
- `partner`
- `faq`
- `pricing`
- `showcase`

## For AI/LLMs Duplicating the Site

The comparison tool is specifically designed to help AI agents understand visual differences:

1. **Run comparison**: `yarn compare --page <page-name>`

2. **Check `summary.md`**: High-level overview of all differences

3. **Review visual diffs**: For pages with major differences (>5%), examine:
   - `diff.png` to see exact pixel differences
   - `sidebyside.png` for layout comparison
   - `production.png` and `local.png` for detailed inspection

4. **Focus on problem areas**: Use bounding boxes to isolate specific sections:

   ```bash
   # Compare just the hero section (example coordinates)
   yarn compare --page home --bbox 0,0,auto,800

   # Compare different regions per viewport
   yarn compare --page pricing \
     --bbox-desktop 0,1000,1200,1000 \
     --bbox-tablet 0,800,1199,1000 \
     --bbox-mobile 0,500,809,800
   ```

5. **Common focus areas** indicated in diff images:
   - Layout inconsistencies (spacing, positioning)
   - Missing or extra elements
   - Typography differences (font size, weight, line height)
   - Color mismatches
   - Responsive behavior issues

6. **Iterate**: After making changes, re-run comparison on the same region:
   ```bash
   yarn compare --page showcase --bbox 0,1000,auto,800
   ```

## Customization

### Add New Pages

Edit the `PAGES` array in either script:

```typescript
const PAGES: PageConfig[] = [
	{ path: '/your-page', name: 'your-page' },
	// ...
]
```

### Adjust Viewports

Edit the `VIEWPORTS` object:

```typescript
const VIEWPORTS = {
	desktop: { width: 1200, height: 800 },
	tablet: { width: 1199, height: 800 },
	mobile: { width: 809, height: 600 },
}
```

### Change Segment Height

In `generate-screenshots.ts`:

```typescript
const SEGMENT_HEIGHT = 600 // Change to your preferred height
```

### Adjust Difference Threshold

In `compare-screenshots.ts`:

```typescript
const threshold = 10 // Pixels can differ by 10 in RGB before counting as different
```

## Troubleshooting

**Screenshots timing out**:

- Increase timeout in the script: `waitUntil: 'networkidle', timeout: 60000`

**Cookie banners not dismissed**:

- Add selectors to `dismissCookieBanner()` function

**High difference percentages**:

- Check if content differs (blog posts, dynamic content)
- Verify fonts are loading correctly
- Check for timing issues (animations, loading states)

**Out of memory**:

- Compare pages one at a time using the page filter
- Reduce concurrent browser contexts
