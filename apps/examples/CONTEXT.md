# Examples App Context

This is the tldraw SDK examples application - a comprehensive showcase and development environment for demonstrating tldraw capabilities. It hosts over 130 example implementations showing different features, integrations, and use cases.

## Purpose & Deployment

**Development**: When you run `yarn dev` from the repository root, this examples app runs at localhost:5420
**Production**: Deployed to [examples.tldraw.com](https://examples.tldraw.com) with each SDK release. Deployed to [examples-canary.tldraw.com](https://examples-canary.tldraw.com) with each push to main
**Documentation Integration**: Individual examples are iframed into the [tldraw.dev examples section](https://tldraw.dev/examples)
**Preview Deployments**: Each PR gets a preview deployment, and canary versions deploy to examples-canary.tldraw.com

## Architecture

### Core Structure

- **Entry Point**: `src/index.tsx` - Main application entry
- **Example Wrapper**: `src/ExampleWrapper.tsx` - Provides consistent layout and error boundaries
- **Example Registry**: `src/examples.tsx` - Central registry of all examples with metadata
- **Example Pages**: `src/ExamplePage.tsx` - Individual example page component

### Example Organization

Each example lives in its own directory under `src/examples/` following these patterns:

- **Folder Naming**: kebab-case (e.g., `custom-shape`, `sync-demo`)
- **Required Files**:
  - `README.md` with frontmatter metadata
  - Main component file ending with `Example.tsx`
- **Optional Files**: CSS files, supporting components, utilities

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

## Example Types

### Core SDK Examples

- **Basic Usage**: Simple editor setups (`basic`, `readonly`)
- **Configuration**: Editor options (`hide-ui`, `dark-mode-toggle`)
- **API Integration**: Editor methods (`api`, `canvas-events`)

### Customization Examples

- **Custom Shapes**: New shape types (`custom-shape`, `ag-grid-shape`)
- **Custom Tools**: Interactive tools (`custom-tool`, `lasso-select-tool`)
- **Custom UI**: Interface modifications (`custom-ui`, `toolbar-groups`)
- **Custom Styling**: Visual customization (`custom-grid`, `frame-colors`)

### Advanced Features

- **Collaboration**: Real-time sync (`sync-demo`, `sync-custom-presence`)
- **Bindings**: Shape relationships (`pin-bindings`, `layout-bindings`)
- **Export/Import**: Data exchange (`export-canvas-as-image`, `snapshots`)
- **Complex Interactions**: Advanced behaviors (`drag-and-drop`, `interactive-shape`)

### Use Case Demonstrations

- **PDF Editor**: Complete PDF annotation tool
- **Image Annotator**: Image markup interface
- **Slides**: Presentation creation tool
- **Education Canvas**: Learning-focused interface

## Development Workflow

### Adding New Examples

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

### Example Component Pattern

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

### Code Style Guidelines

- Use numbered footnote comments: `// [1]`, `// [2]` with explanations at bottom
- Keep examples focused and minimal for "tight" examples
- Add realistic UI for "use-case" examples
- External CSS files should match example name
- Avoid inline styles unless necessary

## Testing & Quality

### Available Commands

- `yarn e2e` - Run end-to-end tests for examples
- `yarn e2e-ui` - Run E2E tests with Playwright UI
- `yarn test` - Run unit tests (if any)
- `yarn lint` - Lint the codebase
- `yarn build` - Build for production

### Testing Infrastructure

- **E2E Tests**: Located in `e2e/` directory using Playwright
- **Performance Tests**: Dedicated performance testing suite
- **Error Boundaries**: Built-in error handling for example failures

## Key Dependencies

### Core tldraw Packages

- `tldraw` - Main SDK with full UI
- `@tldraw/editor` - Core editor (some examples use editor-only)
- `@tldraw/state` - Reactive state management
- `@tldraw/sync` - Collaboration features

### Supporting Libraries

- `react-router-dom` - Client-side routing
- `@tiptap/core` - Rich text editing (some examples)
- `pdf-lib` - PDF manipulation (PDF examples)
- `ag-grid-react` - Data grid component (grid examples)

## Important Files

### Configuration

- `vite.config.ts` - Vite build configuration with example discovery
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

### Core Application Files

- `src/examples.tsx` - Example registry and metadata
- `src/ExampleWrapper.tsx` - Layout wrapper with error boundaries
- `src/hooks/` - Shared hooks for performance monitoring, debugging
- `writing-examples.md` - Comprehensive guide for creating examples

## Development Notes

- Examples should demonstrate single concepts clearly
- Use the existing example patterns and conventions
- Read `writing-examples.md` before creating new examples
- Test examples in both development and production builds
- Consider both desktop and mobile experiences
- Follow the established categorization system for discoverability
