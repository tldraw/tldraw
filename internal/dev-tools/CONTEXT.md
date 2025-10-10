# Dev Tools Context

## Overview

The `@internal/dev-tools` package provides internal development tools for the tldraw team. This is a private package that contains utilities to help with development workflows and debugging.

## Package structure

```
internal/dev-tools/
├── src/
│   ├── App.tsx              # Main app component
│   ├── main.tsx            # React app entry point
│   ├── index.html          # HTML template
│   ├── styles.css          # Global styles
│   └── Bisect/             # Git bisect helper tool
│       ├── Bisect.tsx      # Main bisect component
│       ├── BisectButton.tsx # UI button component
│       ├── PrItem.tsx      # PR list item component
│       └── pr-numbers.ts   # PR data
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Features

### Git bisect tool

The primary feature is a web-based git bisect helper tool that:

- **PR testing**: Allows developers to test different PR preview deployments
- **Binary search**: Implements git bisect logic to find problematic PRs
- **Preview links**: Automatically opens PR preview deployments for testing
- **Interactive UI**: Mark PRs as "good" or "bad" to narrow down issues
- **Progress tracking**: Shows current bisect position and remaining candidates

The tool uses PR preview deployments at `https://pr-{number}-preview-deploy.tldraw.com/` to test different versions.

## Architecture

### Technology stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **CSS**: Vanilla CSS styling

### Key components

- `Bisect.tsx`: Main bisect logic and state management
- `BisectButton.tsx`: Reusable button component
- `PrItem.tsx`: Individual PR item with good/bad marking
- `pr-numbers.ts`: List of PR numbers to bisect through

## Development

### Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build

### Usage

1. Start the dev server: `yarn dev`
2. Click "Start bisect" to begin
3. Test the behavior in the preview links
4. Mark PRs as "good" or "bad"
5. Continue until the problematic PR is identified

## Integration

This tool is designed for internal use by the tldraw development team to:

- Debug regressions between releases
- Identify which PR introduced a bug
- Streamline the bisect process with visual tools
- Test preview deployments efficiently

The tool assumes access to tldraw's PR preview deployment infrastructure.
