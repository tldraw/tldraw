---
title: Documentation site
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - docs
  - documentation
  - tldraw.dev
  - next.js
status: published
date: 12/19/2025
order: 0
---

The documentation site at [tldraw.dev](https://tldraw.dev) hosts the SDK guides, reference docs, and blog content. It is a Next.js 15 app that combines human-written MDX with auto-generated API reference and a searchable index.

## Key components

### Content system

Guides live as MDX in `apps/docs/content`, organized by `sections.json`. The site reads frontmatter to build navigation and metadata.

```yaml
title: Article title
description: Short summary for search
status: published
author: author_key
date: MM/DD/YYYY
order: 1
category: getting-started
```

### API reference generation

API reference pages are generated from TypeScript build outputs via API Extractor and converted to markdown during the refresh pipeline.

### Search

Algolia indexes the processed content so the site can provide full-text search and filtering.

## Data flow

1. MDX and API source files are processed into structured content.
2. Content is stored in SQLite for fast queries.
3. Algolia indexing runs to publish search results.
4. Next.js renders pages from the processed content.

## Development workflow

```bash
yarn dev-docs

yarn refresh-content

yarn refresh-api
```

## Key files

- apps/docs/next.config.js - Next.js configuration
- apps/docs/tailwind.config.js - Styling configuration
- apps/docs/content/sections.json - Content organization
- apps/docs/content/authors.json - Author metadata
- apps/docs/scripts/refresh-content.ts - Content processing
- apps/docs/scripts/create-api-markdown.ts - API doc generation
- apps/docs/scripts/update-algolia-index.ts - Search indexing

## Related

- [`@tldraw/tldraw`](../packages/tldraw.md) - Main SDK being documented
- [Examples app](./examples.md) - Live code examples
