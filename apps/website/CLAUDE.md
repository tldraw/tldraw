# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The tldraw marketing website (tldraw.dev). A Next.js 16 app with a local markdown + SQLite content pipeline, Tailwind CSS for styling, and Playwright for visual regression testing.

## Commands

- `yarn dev` - Start dev server on http://localhost:3002 (refreshes content DB, watches for changes)
- `yarn build` - Production build (refreshes content DB first)
- `yarn refresh-content` - Rebuild the SQLite content database from markdown files
- `yarn lint` - Lint the package
- `yarn screenshots` - Generate reference screenshots with Playwright
- `yarn compare` - Compare production vs local screenshots for visual regression

Run `yarn typecheck` from the **monorepo root**, never bare `tsc`.

## Architecture

### Routing

Uses Next.js App Router with a `(site)` route group that applies the shared SiteLayout (Header/Footer) to all main pages.

Key routes:

- `/` - Homepage
- `/blog`, `/blog/[slug]`, `/blog/category/[category]` - Blog
- `/features`, `/features/[slug]`, `/features/[slug]/[child]` - Feature pages (nested: group → capability)
- `/pricing`, `/careers`, `/company`, `/events`, `/faq`, `/showcase` - Marketing pages
- `/legal/[...slug]` - Dynamic legal pages

### Content management (markdown + SQLite)

Content lives as markdown files in `content/` and is loaded into a SQLite database (`content.db`, gitignored) at build time by `scripts/refresh-content.ts`.

**Content directory structure:**

- `content/pages/` - Page markdown files with YAML front matter. File path determines URL path (e.g., `blog/my-post.md` → `/blog/my-post`, `homepage.md` → `/`)
- `content/collections/` - Reusable content items (testimonials, team, jobs, FAQs, etc.)
  - Each collection has a `_collection.json` config file
  - Items are either individual `.md` files or inline in the config (`inline: true`)

**Database schema (3 tables):**

- `pages` - id, path, title, description, section, layout, status, date, sortIndex, hero, content, metadata (JSON blob)
- `collection_items` - id, collection, sortIndex, title, tags, content, data (JSON blob)
- `headings` - id, pageId, level, title, slug

**Key files:**

- `scripts/lib/connect.ts` - SQLite connection and schema
- `scripts/lib/loadPages.ts` - Reads `content/pages/`, parses front matter, inserts into DB
- `scripts/lib/loadCollections.ts` - Reads `content/collections/`, inserts into DB
- `utils/ContentDatabase.ts` - Read-only singleton for querying (lazy-init, re-creates in dev)
- `utils/collections.ts` - Typed collection query helpers (getTestimonials, getTeamMembers, etc.)
- `utils/shared-sections.ts` - Shared section data from homepage metadata (finalCta, testimonialSection, etc.)
- `utils/render-markdown.ts` - Markdown → HTML via unified/remark/rehype
- `components/markdown.tsx` - Server component wrapping rendered HTML in prose classes
- `types/content-types.ts` - All TypeScript types for DB records and collection data shapes
- `scripts/watcher.ts` - Dev file watcher with WebSocket hot-reload (port 3003)

### Components

- `components/sections/` - Page section components (hero, grids, carousels, pricing tables, etc.)
- `components/navigation/` - Header, Footer, MobileMenu
- `components/ui/` - Reusable primitives (PageHeader, CodeBlock, CopyButton)
- `components/markdown.tsx` - Renders markdown content with Tailwind prose styling

### Styling

Tailwind CSS with class-based dark mode (`next-themes`). Custom config in `tailwind.config.js`:

- Brand blue: `#155DFC`
- Fonts: Archivo (sans), Geist Mono (mono)
- Typography plugin for prose styling

Global styles in `app/globals.css` include Shiki syntax highlighting themes and custom heading letter-spacing.

### Visual regression testing

Playwright scripts in `scripts/` capture screenshots at three breakpoints (desktop 1200px, tablet 1199px, mobile 809px) and compare local vs production. Reference images go in `_reference/`, comparison output in `_comparison/`.
