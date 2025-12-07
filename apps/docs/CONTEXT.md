# @tldraw/docs

Documentation site for the tldraw SDK, hosted at [tldraw.dev](https://tldraw.dev).

## Overview

A Next.js application that generates comprehensive documentation for the tldraw ecosystem. The site combines human-written guides with auto-generated API documentation, all organized in a searchable, navigable interface.

## Architecture

### Tech stack

- **Framework**: Next.js 15 with App Router
- **Content**: MDX for human-written docs, auto-generated from TypeScript via API Extractor
- **Database**: SQLite for content storage and search indexing
- **Styling**: Tailwind CSS with custom components
- **Search**: Algolia for full-text search capabilities
- **Themes**: Dark/light mode support via next-themes

### Content management system

- **Human content**: MDX files in `/content` with frontmatter metadata
- **Generated content**: API docs created from TypeScript source via scripts
- **Database build**: SQLite populated by build scripts for fast querying
- **File watching**: Development mode auto-rebuilds on content changes

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
│   ├── community/      # Community guides
│   └── sections.json   # Content organization
├── components/         # React components
├── scripts/            # Build and content generation
├── utils/              # Shared utilities
└── api/                # API routes
```

## Content architecture

### Section system

Content is organized into sections defined in `sections.json`:

- **getting-started**: Quick start guides
- **docs**: Core SDK documentation
- **community**: Contributing guides
- **reference**: Auto-generated API docs
- **blog**: News and updates
- **legal**: Terms and policies

### Content types

**Human-written content** (`/content/docs`, `/content/getting-started`, etc.):

- MDX files with frontmatter metadata
- Manual curation and organization
- Includes examples, tutorials, guides

**Auto-generated content** (`/content/reference`):

- Generated from TypeScript source via API Extractor
- Covers all public APIs across tldraw packages
- Automatically updated with code changes

### Frontmatter schema

```yaml
title: "Article Title"
description: "SEO and search description"
status: "published" | "draft"
author: "author_key" # References authors.json
date: "MM/DD/YYYY"
order: 1 # Display order within section
category: "category_name" # Optional grouping
keywords: ["tag1", "tag2"] # Search keywords
hero: "image_path" # Social media image
```

## Build process

### Development commands

- `yarn dev` - Development server with file watching
- `yarn dev-docs` - Docs-specific development mode
- `yarn watch-content` - Content file watcher only

### Content generation pipeline

1. **API source fetching** (`fetch-api-source.ts`)
   - Pulls TypeScript definitions from tldraw packages
   - Uses GitHub API or local files

2. **API documentation** (`create-api-markdown.ts`)
   - Processes TypeScript via API Extractor
   - Generates structured markdown for each API

3. **Content processing** (`refresh-content.ts`)
   - Processes all MDX files
   - Populates SQLite database
   - Builds search indices

4. **Search indexing** (`update-algolia-index.ts`)
   - Updates Algolia search index
   - Includes content, metadata, and search keywords

### Complete build

```bash
yarn refresh-everything  # Full regeneration
yarn refresh-content     # Content only
yarn refresh-api         # API docs only
```

## Key components

### Content rendering

- **MDX processing**: `next-mdx-remote-client` for MDX rendering
- **Code highlighting**: Shiki for syntax highlighting
- **Link handling**: Custom components for internal/external links

### Search implementation

- **Algolia integration**: Full-text search across all content
- **InstantSearch**: Real-time search UI components
- **Faceted search**: Filter by content type, section, tags

### Navigation

- **Dynamic sidebar**: Generated from content structure
- **Breadcrumbs**: Contextual navigation
- **Section organization**: Hierarchical content browsing

## API reference generation

### Source processing

Uses Microsoft API Extractor to process TypeScript:

- Extracts public APIs from built packages
- Generates structured documentation data
- Maintains type information and relationships

### Package coverage

Generates docs for all major tldraw packages:

- `@tldraw/editor` - Core editor engine
- `tldraw` - Complete SDK with UI
- `@tldraw/store` - Reactive database
- `@tldraw/state` - Signals library
- `@tldraw/sync` - Multiplayer functionality
- `@tldraw/tlschema` - Type definitions
- `@tldraw/validate` - Validation utilities

### Documentation structure

- **Classes**: Methods, properties, inheritance
- **Functions**: Parameters, return types, examples
- **Types**: Interface definitions, type aliases
- **Enums**: Values and descriptions

## Development workflow

### Content development

1. Write/edit MDX files in appropriate `/content` subdirectory
2. Use proper frontmatter with required fields
3. File watcher auto-rebuilds during development
4. Test locally before committing

### API documentation updates

1. Changes to TypeScript source trigger regeneration
2. Run `yarn refresh-api` to update API docs
3. Verify generated content accuracy
4. Update search indices

### Deployment

- **Build**: `yarn build` generates static site
- **Content validation**: Link checking, broken reference detection
- **Search**: Algolia index updates during build
- **Assets**: Optimized images, fonts, and static resources

## Integration points

### With main repository

- **Source dependency**: Reads from tldraw package builds
- **Version sync**: Tracks main repository releases
- **Asset sharing**: Uses shared icons, fonts from `/assets`

### External services

- **Algolia**: Search indexing and querying
- **GitHub API**: Source code fetching for API docs
- **Analytics**: User interaction tracking

## Performance considerations

### Static generation

- Most pages pre-rendered at build time
- Dynamic content cached in SQLite
- Incremental Static Regeneration for updates

### Search optimization

- Algolia handles search queries
- Client-side search UI components
- Debounced search input for performance

### Asset optimization

- Next.js automatic image optimization
- Font subsetting and preloading
- CSS optimization and purging

## Key files

**Configuration**:

- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Styling configuration
- `tsconfig.json` - TypeScript settings

**Content management**:

- `content/sections.json` - Content organization
- `content/authors.json` - Author metadata
- `watcher.ts` - Development file watching

**Build scripts**:

- `scripts/refresh-content.ts` - Content processing
- `scripts/create-api-markdown.ts` - API doc generation
- `scripts/update-algolia-index.ts` - Search indexing

This documentation site serves as the primary resource for developers using the tldraw SDK, combining comprehensive API references with practical guides and examples.
