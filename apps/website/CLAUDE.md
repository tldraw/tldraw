# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The tldraw marketing website (tldraw.dev). A Next.js 16 app with Sanity CMS for content management, Tailwind CSS for styling, and Playwright for visual regression testing.

## Commands

- `yarn dev` - Start dev server on http://localhost:3002
- `yarn build` - Production build
- `yarn lint` - Lint the package
- `yarn screenshots` - Generate reference screenshots with Playwright
- `yarn compare` - Compare production vs local screenshots for visual regression

Run `yarn typecheck` from the **monorepo root**, never bare `tsc`.

## Architecture

### Routing

Uses Next.js App Router with a `(site)` route group that applies the shared SiteLayout (Header/Footer) to all main pages. The `/studio` route is outside this group and hosts the Sanity Studio admin interface.

Key routes:
- `/` - Homepage (singleton document from Sanity)
- `/blog`, `/blog/[slug]`, `/blog/category/[category]` - Blog
- `/features`, `/features/[slug]`, `/features/[slug]/[child]` - Feature pages (nested: group → capability)
- `/pricing`, `/careers`, `/company`, `/events`, `/faq`, `/showcase` - Marketing pages
- `/legal/[...slug]` - Dynamic legal pages
- `/api/draft` - Sanity draft mode toggle
- `/api/revalidate` - ISR revalidation webhook

### Content management (Sanity)

Content is fetched server-side via GROQ queries in `sanity/queries.ts`. Each query function uses `fetchOrNull()`/`fetchOrEmpty()` wrappers for error handling.

- **Schemas**: `sanity/schemas/` - ~20 document types (blogPost, featurePage, homepage, pricingPage, etc.)
- **Types**: `sanity/types.ts` - TypeScript interfaces mirroring Sanity schemas
- **Client**: `sanity/client.ts` - Sanity client initialization
- **Image URLs**: `sanity/image.ts` - `@sanity/image-url` builder utility
- **Config**: `sanity/config.ts` - Project ID, dataset, API version

Singleton documents (homepage, pricingPage, siteSettings, companyPage, showcasePage) are fetched as single documents, not lists.

Fallback content in `content/` (homepage.ts, careers.ts) is used when Sanity is unavailable.

### Components

- `components/sections/` - Page section components (hero, grids, carousels, pricing tables, etc.)
- `components/navigation/` - Header, Footer, MobileMenu
- `components/ui/` - Reusable primitives (PageHeader, CodeBlock, CopyButton)
- `components/portable-text/` - Rich text rendering from Sanity (handles images, code blocks, callouts, YouTube embeds)

### Styling

Tailwind CSS with class-based dark mode (`next-themes`). Custom config in `tailwind.config.js`:
- Brand blue: `#155DFC`
- Fonts: Archivo (sans), Geist Mono (mono)
- Typography plugin for prose styling

Global styles in `app/globals.css` include Shiki syntax highlighting themes and custom heading letter-spacing.

### Environment variables

Create `.env.local` from `.env.example`:
- `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` - Sanity project config
- `SANITY_API_TOKEN` - API token for server-side fetching
- `SANITY_PREVIEW_SECRET` - Draft mode authentication
- `SANITY_REVALIDATE_SECRET` - ISR webhook authentication

### Visual regression testing

Playwright scripts in `scripts/` capture screenshots at three breakpoints (desktop 1200px, tablet 1199px, mobile 809px) and compare local vs production. Reference images go in `_reference/`, comparison output in `_comparison/`.
