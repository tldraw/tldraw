---
title: Documentation site
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - docs
  - documentation
  - tldraw.dev
  - next.js
---

The documentation site for the tldraw SDK, hosted at [tldraw.dev](https://tldraw.dev). It combines human-written guides with auto-generated API documentation in a searchable, navigable interface.

## Overview

A Next.js 15 application that generates comprehensive documentation for the tldraw ecosystem:

- Human-written guides and tutorials
- Auto-generated API reference from TypeScript source
- Full-text search via Algolia
- Dark/light theme support

## Tech stack

- **Framework**: Next.js 15 with App Router
- **Content**: MDX for guides, auto-generated from TypeScript
- **Database**: SQLite for content storage and indexing
- **Styling**: Tailwind CSS
- **Search**: Algolia for full-text search
- **Themes**: next-themes for dark/light mode

## Directory structure

```
apps/docs/
├── app/                 # Next.js App Router pages
│   ├── (docs)/         # Documentation routes
│   ├── (marketing)/    # Marketing pages
│   ├── blog/           # Blog functionality
│   └── search/         # Search implementation
├── content/            # All documentation content
│   ├── docs/           # Human-written guides
│   ├── reference/      # Auto-generated API docs
│   ├── blog/           # Blog posts
│   ├── getting-started/# Onboarding content
│   └── sections.json   # Content organization
├── components/         # React components
├── scripts/            # Build and content generation
└── utils/              # Shared utilities
```

## Content system

### Sections

Content is organized into sections defined in `sections.json`:

| Section           | Purpose                 |
| ----------------- | ----------------------- |
| `getting-started` | Quick start guides      |
| `docs`            | Core SDK documentation  |
| `community`       | Contributing guides     |
| `reference`       | Auto-generated API docs |
| `blog`            | News and updates        |
| `legal`           | Terms and policies      |

### Frontmatter

```yaml
title: 'Article Title'
description: 'SEO and search description'
status: 'published' # or "draft"
author: 'author_key'
date: 'MM/DD/YYYY'
order: 1
category: 'category_name'
keywords: ['tag1', 'tag2']
hero: 'image_path'
```

## Build process

### Development

```bash
yarn dev-docs        # Start development server
yarn watch-content   # Content file watcher only
```

### Content generation

```bash
yarn refresh-everything  # Full regeneration
yarn refresh-content     # Content only
yarn refresh-api         # API docs only
```

### Pipeline

1. **API source fetching**: Pull TypeScript definitions from packages
2. **API documentation**: Process via API Extractor to generate markdown
3. **Content processing**: Process MDX files, populate SQLite
4. **Search indexing**: Update Algolia search index

## API reference generation

### Source processing

Uses Microsoft API Extractor to process TypeScript:

- Extracts public APIs from built packages
- Generates structured documentation data
- Maintains type information and relationships

### Package coverage

- `@tldraw/editor` - Core editor engine
- `tldraw` - Complete SDK with UI
- `@tldraw/store` - Reactive database
- `@tldraw/state` - Signals library
- `@tldraw/sync` - Multiplayer functionality
- `@tldraw/tlschema` - Type definitions
- `@tldraw/validate` - Validation utilities

## Key components

### Content rendering

- **MDX processing**: `next-mdx-remote-client` for MDX
- **Code highlighting**: Shiki syntax highlighting
- **Link handling**: Custom components for internal/external links

### Search

- **Algolia**: Full-text search across all content
- **InstantSearch**: Real-time search UI
- **Faceted search**: Filter by type, section, tags

### Navigation

- **Dynamic sidebar**: Generated from content structure
- **Breadcrumbs**: Contextual navigation
- **Section organization**: Hierarchical browsing

## Development workflow

### Writing documentation

1. Create/edit MDX files in `/content`
2. Add proper frontmatter with required fields
3. File watcher auto-rebuilds during development
4. Test locally before committing

### Updating API docs

1. Make changes to TypeScript source
2. Run `yarn refresh-api`
3. Verify generated content
4. Update search indices

## Key files

- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Styling configuration
- `content/sections.json` - Content organization
- `content/authors.json` - Author metadata
- `scripts/refresh-content.ts` - Content processing
- `scripts/create-api-markdown.ts` - API doc generation
- `scripts/update-algolia-index.ts` - Search indexing

## Related

- [@tldraw/tldraw](../packages/tldraw.md) - Main SDK being documented
- [Examples app](./examples.md) - Live code examples
