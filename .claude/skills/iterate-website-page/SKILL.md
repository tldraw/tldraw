---
name: iterate-website-page
description: Iterate on a page in apps/website to match the production tldraw.dev site. Use when improving visual fidelity of a website page, fixing layout/styling differences between local and production, or when asked to work on the website port. Triggers on phrases like "iterate on the website", "fix the home page", "match the production site", "compare screenshots", or any website page improvement task.
---

# Iterate on website page

Port content and design from tldraw.dev (Framer) into `apps/website` (Next.js + Tailwind). The goal is pixel-level reproduction. Content lives in Sanity CMS; layout and styling live in the Next.js app.

**IMPORTANT**: When this skill is invoked, read `scripts/README.md` in this folder for complete documentation of the comparison tools, including all bounding box features and options.

## Skill Invocation Parameters

When invoking this skill, the user may specify:

**Threshold**: Custom exit criteria

- Default: `< 10%`
- Examples: `< 5%`, `< 1%`, `under 3 percent`

**Viewports**: Which breakpoints to test

- Default: All (desktop, tablet, mobile)
- Examples: `desktop only`, `mobile and tablet`, `just mobile`

**Region/Focus**: Specific areas to compare

- Default: Full page
- Examples:
  - `hero section` → bbox covering top ~800px
  - `above the fold` → bbox covering first viewport height
  - `footer` → bbox covering bottom section
  - `pricing table` → bbox covering that component
  - `bbox 0,1000,auto,500` → explicit coordinates

**Parse the user's instructions** to extract these parameters, then use them throughout the workflow to:

1. Run comparisons with appropriate `--bbox` arguments
2. Check only the specified viewports in summary
3. Apply the specified threshold as exit criteria

## Workflow

**CRITICAL: Always work top-to-bottom.** Spacing and layout issues near the top of the page cascade downward — a wrong margin or padding in the header or hero section will push everything below it out of alignment. Always fix issues higher up on the page before comparing or attempting to fix issues lower down. When analyzing diffs, ignore differences in the lower half of the page until the upper half matches. Re-run comparisons after each fix to see if lower sections improved as a side effect.

Repeat this loop until the section(s) are majority correct:

1. **Compare** - Generate fresh screenshots
2. **Analyze** - Read the diff/side-by-side (production on left, local on right), identify the **highest** problem area on the page
3. **Focus** - Use bounding box to isolate that top-most problem area
4. **Fix** - Edit components/styles for that area
5. **Verify** - Re-run comparison on the fixed area
6. **Progress downward** - Move to the next section down the page and repeat
7. **Check viewports** - Once a section matches on desktop, check tablet and mobile before moving further down

## Exit Criteria: "Majority Correct Across All Breakpoints"

**Default threshold**: **< 10% pixel difference** across all tested viewports.

The user may specify tighter thresholds, specific viewports, or focused regions when invoking this skill. Check the task parameters for:

- Custom threshold (e.g., "< 5%", "< 1%")
- Specific viewports to test (e.g., "desktop only", "mobile and tablet")
- Specific regions via bounding boxes (e.g., "hero section", "pricing table")
- Specific sections to focus on (e.g., "above the fold", "footer")

Stop iterating when **all three conditions** are met:

### 1. Quantitative Threshold

**Default: All viewports (desktop, tablet, mobile) must be < 10%**

Override examples from user:

- "Focus on desktop only" → only check desktop
- "< 5% threshold" → use 5% instead of 10%
- "Compare hero section only" → use bounding box for hero area
- "Mobile and tablet" → skip desktop comparison

Run final comparison:

```bash
# Full page (default)
yarn compare --page <page-name>

# With bounding box if specified
yarn compare --page <page-name> --bbox 0,1000,auto,1000

# Specific viewports only (check only those in summary)
yarn compare --page <page-name>  # Then verify only requested viewports
```

Check `assets/summary.md` (in the skill folder) - requested viewports should meet the threshold.

### 2. Visual Structure Match (Qualitative)

Compare `sidebyside.png` for each viewport (production on left, local on right) and verify:

- ✅ **Layout structure**: Sections in correct order, proper stacking/flow
- ✅ **Grid/column layouts**: Correct number of columns at each breakpoint
- ✅ **Spacing**: Section padding, element gaps, margins match visually
- ✅ **Typography**: Font sizes, weights, line heights appear equivalent
- ✅ **Colors**: Background, text, and border colors match
- ✅ **Component positioning**: Headers, buttons, images in correct locations
- ✅ **Responsive behavior**: Correct breakpoint transitions (e.g., 3-col → 2-col → 1-col)

### 3. Documented Acceptable Differences

Some differences are expected and acceptable. Document these in your final summary:

**Always acceptable (ignore these):**

- Interactive canvas demos (tldraw editor instances)
- Dynamic timestamps or dates
- Cookie consent banners
- Animation mid-states
- Loading states
- Random/shuffled content order
- Font rendering micro-differences (subpixel antialiasing)

**Conditionally acceptable (document in summary):**

- Content differences (if Sanity CMS content doesn't match production yet)
- Missing features not yet implemented (note these as "Known gaps:")
- Placeholder images vs. final assets

## Example Exit Summaries

When exiting, provide a summary that reflects the task parameters:

### Example 1: Default (all viewports, < 10%)

```
## Home Page - Iteration Complete

### Task Parameters
- Threshold: < 10% (default)
- Viewports: All (desktop, tablet, mobile)
- Region: Full page

### Final Comparison Results
- Desktop: 8.2% difference ✅
- Tablet: 9.1% difference ✅
- Mobile: 7.6% difference ✅

### Visual Match Confirmation
✅ Layout structure matches across all viewports
✅ Typography and spacing correct
✅ Colors match brand palette
✅ Responsive grid behavior (3-col → 2-col → 1-col)

### Known Acceptable Differences (contributing to %)
- Hero canvas demo (interactive element) ~3%
- Blog post timestamps differ (production content) ~1%
- Font rendering micro-differences ~2%

### Remaining Gaps
- None

**Status**: Meets < 10% threshold on all viewports.
```

### Example 2: Parameterized (desktop only, < 5%, hero section)

```
## Pricing Page - Hero Section - Iteration Complete

### Task Parameters
- Threshold: < 5% (specified by user)
- Viewports: Desktop only (specified by user)
- Region: Hero section, bbox 0,0,1200,800 (specified by user)

### Final Comparison Results
- Desktop hero: 4.2% difference ✅

### Visual Match Confirmation (Hero Section)
✅ Headline typography matches
✅ CTA button styling correct
✅ Background gradient matches
✅ Pricing card layout matches

### Known Acceptable Differences
- Pricing amounts may differ (Sanity CMS content)

### Remaining Gaps
- Footer not tested (out of specified region)
- Mobile/tablet not tested (out of scope)

**Status**: Hero section meets < 5% threshold on desktop.
```

If any gaps remain or thresholds aren't met, list them clearly and confirm with user before proceeding.

## Step 1: Compare

Run the comparison script from `apps/website/`:

```bash
cd apps/website && yarn compare --page <page-name>
```

Or directly:

```bash
cd apps/website && npx tsx ../../.claude/skills/iterate-website-page/scripts/compare-screenshots.ts --page <page-name>
```

Arguments:

- `--page <name>` or `-p <name>`: Compare a single page (home, careers, blog, pricing, etc.)
- `--bbox x,y,width,height`: Crop to a region (applies to all viewports, use "auto" for dimensions)
- `--bbox-desktop x,y,width,height`: Desktop-specific bounding box
- `--bbox-tablet x,y,width,height`: Tablet-specific bounding box
- `--bbox-mobile x,y,width,height`: Mobile-specific bounding box
- Positional: `[production-url] [local-url]` (defaults: `https://tldraw.dev` and `http://localhost:3002`)
- `--help`: Show detailed usage information

Available page names: home, careers, blog, blog-category-product, blog-article-engineering-imperfection, events, partner, faq, pricing, showcase

See `scripts/README.md` in this skill folder for complete documentation.

Output goes to `.claude/skills/iterate-website-page/assets/<page>/<viewport>/`:

- `production.png` - Screenshot from tldraw.dev
- `local.png` - Screenshot from localhost
- `diff.png` - Red highlights on grayscale (red = different)
- `sidebyside.png` - Side-by-side: production site (left) vs local `apps/website` (right). Canvas height matches the tallest of the two images; the shorter image has white space at the bottom.
- `.claude/skills/iterate-website-page/assets/summary.md` - Overall report

## Step 2: Analyze

Read the diff images and summary. Look for:

- **Layout shifts**: Elements at different vertical positions
- **Spacing**: Padding/margin/gap differences
- **Typography**: Font size, weight, line-height, letter-spacing
- **Colors**: Background, text, border colors
- **Missing content**: Sections not yet implemented
- **Extra content**: Elements present locally but not on production
- **Responsive issues**: Things that break at tablet (1199px) or mobile (809px)

## Step 3: Focus with bounding box

Once a problem area is identified, re-run with `--bbox` to get a detailed crop:

```bash
yarn compare --page home --bbox 0,800,auto,600
```

This compares only the region from (0,800) with height 600px. Using "auto" for width makes it adapt to each viewport (1200px for desktop, 1199px for tablet, 809px for mobile).

For viewport-specific regions:

```bash
yarn compare --page home \
  --bbox-desktop 0,1000,1200,1000 \
  --bbox-tablet 0,800,1199,1000 \
  --bbox-mobile 0,500,809,800
```

Use the full-page screenshots to estimate y-coordinates for problem sections.

**IMPORTANT**: Always start from the top of the page and work down. Spacing and layout differences at the top cascade into everything below — a section with wrong padding will shift every subsequent section's y-position, making the entire lower page appear as a diff even though only the upstream spacing is wrong. Fix the topmost discrepancy first, re-compare, and only then move to the next section.

## Step 4: Fix

### Project structure

```
apps/website/
├── app/(site)/           # Page routes
│   ├── page.tsx          # Home page (/)
│   ├── blog/page.tsx     # Blog listing
│   ├── pricing/page.tsx  # Pricing
│   └── ...
├── components/
│   ├── sections/         # Page section components
│   ├── navigation/       # Header, footer, mobile menu
│   ├── ui/               # Reusable UI (code-block, page-header, etc.)
│   └── portable-text/    # Sanity rich text renderer
├── app/globals.css       # Global styles + Tailwind
├── tailwind.config.ts    # Tailwind theme (colors, fonts, breakpoints)
└── _reference/           # Reference screenshots from production (by page/viewport)
```

### Key patterns

- **Tailwind**: All styling via Tailwind utility classes. Check `tailwind.config.ts` for custom theme values.
- **Dark mode**: Uses `dark:` variants. The site is dark-mode-first.
- **Responsive**: Desktop-first. Use reference screenshots at all three viewports:
  - Desktop: 1200px wide
  - Tablet: 1199px wide
  - Mobile: 809px wide
- **Sanity content**: Dynamic content comes from Sanity CMS via server components. Don't hardcode content that should come from the CMS.
- **Reference screenshots**: `_reference/<page>/<viewport>/` contains numbered screenshots of the production page at that viewport, captured in viewport-height segments. Use these to understand what the page should look like.

### Prefer theme-level fixes over local overrides

When you notice a recurring issue — e.g., font sizes are consistently too large, section spacing is uniformly off, or colors don't match — check whether the fix belongs in the Tailwind theme (`tailwind.config.ts`) or global styles (`app/globals.css`) rather than adding one-off overrides to individual components. A single theme-level change (font scale, spacing scale, color value) can fix many components at once and keeps the codebase consistent. Local overrides and exceptions are fine when a specific component genuinely differs from the pattern, but always look for the systemic fix first.

### Common fixes

- **Vertical spacing**: Check section padding (`py-`, `my-`, `gap-`, `space-y-`). If many sections have the same offset, the issue may be in the theme spacing scale.
- **Max width**: The site uses a centered container; check `max-w-` and `mx-auto`
- **Font sizing**: Production uses specific sizes; compare against reference screenshots. If all headings are off by the same amount, check the theme's font-size scale in `tailwind.config.ts`.
- **Grid layouts**: Check `grid-cols-`, `gap-`, responsive variants (`md:grid-cols-3`, etc.)
- **Colors**: The production site has specific brand colors; check `tailwind.config.ts`. If a color is wrong everywhere, fix the theme value, not each usage.

## Step 5: Verify

After making fixes, re-run the comparison (with the same bounding box if you used one):

```bash
yarn compare --page home --bbox 0,800,auto,600
```

Check that the diff percentage decreased. Open the new `diff.png` to confirm the red areas shrank.

## Step 6: Check viewports

The comparison script runs all three viewports by default. After fixing desktop, check tablet and mobile:

```bash
# Check all viewports at once
yarn compare --page home
```

Review `assets/home/tablet/` and `assets/home/mobile/` (in the skill folder) for responsive issues. Common problems:

- Grids that should collapse to fewer columns
- Font sizes that should scale down
- Horizontal padding that should decrease
- Elements that should stack vertically on mobile

## Notes

- The local dev server must be running on port 3002 before running comparisons.
- The comparison script takes ~60s per page (three viewports, with wait times for content to settle).
- Height differences between production and local are normal during porting; focus on matching sections top-down rather than overall height.
- Some differences are acceptable: cookie banners, dynamic content timestamps, animation states.
- The tldraw hero demo on the home page will always differ from production (it's interactive canvas vs static).
- - The header will be different between production and local; that's acceptable. The header on desktop is 100px tall; you can skip comparing it using bounding boxes (e.g. --bbox -0,100,auto,600)
- Don't forget: work "top to bottom" because spacing and layout issues at the top of the page cascade downward.
