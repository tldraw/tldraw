# Examples App Context

This is the tldraw SDK examples application - a comprehensive showcase and development environment for demonstrating tldraw capabilities. It hosts over 130 example implementations showing different features, integrations, and use cases.

## Purpose & deployment

**Development**: When you run `yarn dev` from the repository root, this examples app runs at localhost:5420
**Production**: Deployed to [examples.tldraw.com](https://examples.tldraw.com) with each SDK release. Deployed to [examples-canary.tldraw.com](https://examples-canary.tldraw.com) with each push to main
**Documentation Integration**: Individual examples are iframed into the [tldraw.dev examples section](https://tldraw.dev/examples)
**Preview Deployments**: Each PR gets a preview deployment, and canary versions deploy to examples-canary.tldraw.com

## Architecture

### Core structure

- **Entry point**: `src/index.tsx` - Main application entry
- **Example wrapper**: `src/ExampleWrapper.tsx` - Provides consistent layout and error boundaries
- **Example registry**: `src/examples.tsx` - Central registry of all examples with metadata
- **Example pages**: `src/ExamplePage.tsx` - Individual example page component

### Example organization

Each example lives in its own directory under `src/examples/` following these patterns:

- **Folder naming**: kebab-case (e.g., `custom-shape`, `sync-demo`)
- **Required files**:
  - `README.md` with frontmatter metadata
  - Main component file ending with `Example.tsx`
- **Optional files**: CSS files, supporting components, utilities

### Categories

Examples are organized into these categories:

- `getting-started` - Basic usage patterns
- `configuration` - Editor setup and options
- `editor-api` - Core editor API usage
- `ui` - User interface customization
- `layout` - Canvas and viewport control
- `events` - Event handling and interactivity
- `shapes/tools` - Custom shapes and tools
- `collaboration` - Multi-user features
- `data/assets` - Data management and asset handling
- `use-cases` - Complete application scenarios

## Example types

### Core SDK examples

- **Basic usage**: Simple editor setups (`basic`, `readonly`)
- **Configuration**: Editor options (`hide-ui`, `dark-mode-toggle`)
- **API integration**: Editor methods (`api`, `canvas-events`)

### Customization examples

- **Custom shapes**: New shape types (`custom-shape`, `ag-grid-shape`)
- **Custom tools**: Interactive tools (`custom-tool`, `lasso-select-tool`)
- **Custom UI**: Interface modifications (`custom-ui`, `toolbar-groups`)
- **Custom styling**: Visual customization (`custom-grid`, `frame-colors`)

### Advanced features

- **Collaboration**: Real-time sync (`sync-demo`, `sync-custom-presence`)
- **Bindings**: Shape relationships (`pin-bindings`, `layout-bindings`)
- **Export/import**: Data exchange (`export-canvas-as-image`, `snapshots`)
- **Complex interactions**: Advanced behaviors (`drag-and-drop`, `interactive-shape`)

### Use case demonstrations

- **PDF editor**: Complete PDF annotation tool
- **Image annotator**: Image markup interface
- **Slides**: Presentation creation tool
- **Education canvas**: Learning-focused interface

## Development workflow

### Adding new examples

1. Create folder in `src/examples/` with kebab-case name
2. Add `README.md` with proper frontmatter:

   ```md
   ---
   title: Example Name
   component: ./ExampleComponent.tsx
   category: appropriate-category
   priority: number
   keywords: [relevant, search, terms]
   ---

   ## One-line summary

   Detailed description
   ```

3. Create main component file ending with `Example.tsx`
4. Follow established patterns for layout and styling

### Example component pattern

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function YourExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
```

### Code style guidelines

- Use numbered footnote comments: `// [1]`, `// [2]` with explanations at bottom
- Keep examples focused and minimal for "tight" examples
- Add realistic UI for "use-case" examples
- External CSS files should match example name
- Avoid inline styles unless necessary

## Testing & quality

### Available commands

- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-ui` - Run E2E tests with Playwright UI
- `yarn test` - Run unit tests (if any)
- `yarn lint` - Lint the codebase
- `yarn build` - Build for production

### Testing infrastructure

- **E2E tests**: Located in `e2e/` directory using Playwright
- **Performance tests**: Dedicated performance testing suite
- **Error boundaries**: Built-in error handling for example failures

## Key dependencies

### Core tldraw packages

- `tldraw` - Main SDK with full UI
- `@tldraw/editor` - Core editor (some examples use editor-only)
- `@tldraw/state` - Reactive state management
- `@tldraw/sync` - Collaboration features

### Supporting libraries

- `react-router-dom` - Client-side routing
- `@tiptap/core` - Rich text editing (some examples)
- `pdf-lib` - PDF manipulation (PDF examples)
- `ag-grid-react` - Data grid component (grid examples)

## Important files

### Configuration

- `vite.config.ts` - Vite build configuration with example discovery
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Core application files

- `src/examples.tsx` - Example registry and metadata
- `src/ExampleWrapper.tsx` - Layout wrapper with error boundaries
- `src/hooks/` - Shared hooks for performance monitoring, debugging
- `writing-examples.md` - Comprehensive guide for creating examples

## Development notes

- Examples should demonstrate single concepts clearly
- Use the existing example patterns and conventions
- Read `writing-examples.md` before creating new examples
- Test examples in both development and production builds
- Consider both desktop and mobile experiences
- Follow the established categorization system for discoverability
