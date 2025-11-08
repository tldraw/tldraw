# Entry Points - Detailed Notes

## Overview

This document catalogs all entry points into the tldraw codebase, including SDK integration, development servers, CLI tools, APIs, and HTTP endpoints. Understanding these entry points is essential for both users and developers.

## SDK Entry Points

### 1. React Application Integration

**Minimal Setup:**
```bash
npm install tldraw
# or
yarn add tldraw
```

```typescript
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
  return <Tldraw />
}
```

**Key Points:**
- Most common entry point for SDK users
- Includes complete UI, shapes, and tools
- Requires React 18+
- CSS must be imported
- No additional configuration needed

**Environment Requirements:**
- Node.js ^20.0.0
- React ^18.0.0 || ^19.0.0
- Modern bundler (Vite, Webpack, Next.js, etc.)

---

### 2. Custom Store Integration

**When to use:** Need persistence, external store, or custom initialization.

```typescript
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
  return (
    <Tldraw
      persistenceKey="my-app-v1"
      // IndexedDB persistence with this key
    />
  )
}
```

**With External Store:**
```typescript
import { createTLStore, Tldraw } from 'tldraw'

const store = createTLStore({
  // Custom initialization
})

function App() {
  return <Tldraw store={store} />
}
```

**Use Cases:**
- IndexedDB persistence
- External state management
- Pre-populated initial state
- Multiple editor instances

---

### 3. Custom Shapes Integration

**When to use:** Adding custom shape types.

```typescript
import { Tldraw, BaseBoxShapeUtil, TLBaseShape } from 'tldraw'

type MyShape = TLBaseShape<'my-shape', { color: string }>

class MyShapeUtil extends BaseBoxShapeUtil<MyShape> {
  static override type = 'my-shape' as const

  getDefaultProps() {
    return { w: 100, h: 100, color: 'blue' }
  }

  component(shape: MyShape) {
    return <div style={{ background: shape.props.color }} />
  }

  indicator(shape: MyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}

function App() {
  return <Tldraw shapeUtils={[MyShapeUtil]} />
}
```

**Key Points:**
- Custom shapes merged with default shapes
- ShapeUtil defines behavior
- Type safety via TypeScript
- Can also provide custom tools

---

### 4. Custom UI Integration

**When to use:** Need to customize or replace UI components.

```typescript
import { Tldraw, TLUiOverrides } from 'tldraw'

const components = {
  Toolbar: MyCustomToolbar,
  StylePanel: MyCustomStylePanel,
}

function App() {
  return <Tldraw components={components} />
}
```

**Complete Override:**
Every UI component can be replaced via the `components` prop.

**Use Cases:**
- Custom branding
- Different UX patterns
- Mobile-specific UI
- Embedded contexts

---

### 5. Editor-Only Integration

**When to use:** Need canvas engine without default UI/shapes.

```typescript
import { TldrawEditor } from '@tldraw/editor'
import '@tldraw/editor/editor.css'

function App() {
  return (
    <TldrawEditor
      shapeUtils={myShapeUtils}
      tools={myTools}
      bindingUtils={myBindingUtils}
    />
  )
}
```

**Key Differences from Tldraw:**
- No UI (toolbar, panels, etc.)
- No default shapes
- No default tools
- Smaller bundle size
- Maximum flexibility

**Use Cases:**
- Highly custom applications
- Embedded contexts
- Specialized tools
- Minimal overhead

---

### 6. Multiplayer Integration

**Production Setup:**
```typescript
import { useSync } from '@tldraw/sync'
import { Tldraw } from 'tldraw'

function MultiplayerApp() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123',
    assets: {
      upload: async (asset, file) => {
        // Upload to your server
        return { src: uploadedUrl }
      },
      resolve: (asset, context) => asset.props.src
    },
    userInfo: {
      id: 'user-123',
      name: 'Alice',
      color: '#ff0000'
    }
  })

  if (store.status === 'loading') return <Loading />
  if (store.status === 'error') return <Error />

  return <Tldraw store={store.store} />
}
```

**Demo Server (Quick Prototyping):**
```typescript
import { useSyncDemo } from '@tldraw/sync'

function DemoApp() {
  const store = useSyncDemo({
    roomId: 'my-test-room-123'
  })

  return <Tldraw store={store} />
}
```

**Key Points:**
- `useSync` for production with your own server
- `useSyncDemo` for quick prototyping (tldraw demo server)
- Asset store required for production
- Connection status handling

---

### 7. Custom Store Creation

**Advanced Use Case:**
```typescript
import { createTLStore, defaultShapeUtils } from 'tldraw'

const store = createTLStore({
  shapeUtils: defaultShapeUtils,
  bindingUtils: defaultBindingUtils,
  initialData: savedData, // Pre-populate
  collaboration: {
    status: 'online',
    mode: 'readwrite'
  }
})
```

**Use Cases:**
- Multiple editor instances
- Pre-loading data
- Custom collaboration setup
- Advanced state management

---

## Development Entry Points

### 1. Examples App (Primary Development)

**Start Server:**
```bash
yarn dev
# Starts at http://localhost:5420
```

**Purpose:**
- Primary development environment
- 130+ examples showcasing SDK
- Hot reload for fast iteration
- Testing ground for changes

**Routes:**
- `/` - Examples gallery
- `/examples/:category/:example` - Individual examples

**Adding New Example:**
1. Create directory: `/apps/examples/src/examples/your-example/`
2. Add `README.md` with frontmatter
3. Create `YourExample.tsx` component
4. Follow `/apps/examples/writing-examples.md`

**Key Files:**
- `apps/examples/src/examples/` - All examples
- `apps/examples/writing-examples.md` - Guidelines
- `apps/examples/vite.config.ts` - Vite configuration

---

### 2. tldraw.com Development

**Start Server:**
```bash
yarn dev-app
# Starts at http://localhost:3000
```

**Purpose:**
- Develop tldraw.com frontend
- Test collaboration features
- File management development

**Prerequisites:**
- PostgreSQL running locally
- Environment variables set (`.env.development`)
- Clerk auth keys configured

**Key Routes:**
- `/` - Landing/TLA (file browser)
- `/new` - Create new file
- `/f/:fileId` - File editor
- `/f/:fileId/h` - File history

**Environment Variables:**
```bash
# .env.development
DATABASE_URL=postgresql://...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_SECRET_KEY=sk_test_...
VITE_APP_URL=http://localhost:3000
```

**Key Files:**
- `apps/dotcom/client/src/main.tsx` - Entry point
- `apps/dotcom/client/src/routes.tsx` - Route definitions
- `apps/dotcom/client/src/tla/` - TLA (file management) system

---

### 3. Documentation Development

**Start Server:**
```bash
yarn dev-docs
# Starts at http://localhost:3000
```

**Purpose:**
- Develop tldraw.dev documentation
- Preview content changes
- Test interactive examples

**Technology:**
- Next.js for SSG/SSR
- MDX for content
- SQLite for data
- Algolia for search

**Key Files:**
- `apps/docs/` - Documentation site
- `apps/docs/content/` - MDX content files

---

### 4. VSCode Extension Development

**Start Development:**
```bash
yarn dev-vscode
# Then press F5 in VSCode
```

**Purpose:**
- Develop .tldr file support
- Test extension features
- Debug webview integration

**How It Works:**
1. Extension Host window opens
2. Create or open .tldr file
3. Webview loads tldraw editor
4. Changes saved to file

**Key Files:**
- `apps/vscode/extension/` - Extension source
- `apps/vscode/extension/src/TldrawWebviewManager.ts` - Main logic

---

### 5. Template Development

**Run Template:**
```bash
yarn dev-template vite
# or
yarn dev-template nextjs
yarn dev-template vue
yarn dev-template sync-cloudflare
```

**Purpose:**
- Test starter templates
- Develop new templates
- Verify template functionality

**Available Templates:**
- **vite** - Vite integration (fastest)
- **nextjs** - Next.js with SSR
- **vue** - Vue 3 integration
- **sync-cloudflare** - Multiplayer with Durable Objects
- **ai** - AI integration examples
- **branching-chat** - AI chat UI
- **workflow** - Visual programming

---

## CLI Entry Points

### 1. npm create tldraw

**Interactive Project Scaffolding:**
```bash
npm create tldraw@latest my-app
# Interactive prompts:
# - Select template
# - Choose package manager
# - Install dependencies
```

**What It Does:**
1. Prompts for template selection
2. Creates project directory
3. Copies template files
4. Installs dependencies
5. Provides next steps

**Templates:**
- Vite (recommended for beginners)
- Next.js (for SSR needs)
- Vue (for Vue developers)
- Sync Cloudflare (for multiplayer)
- And more...

**Package:**
- `@tldraw/create-tldraw` npm package
- Source: `/packages/create-tldraw/`

---

### 2. Context Tool

**Find Nearest CONTEXT.md:**
```bash
yarn context
# Shows nearest CONTEXT.md file
```

**Flags:**
```bash
yarn context -v  # Verbose output
yarn context -r  # Recursive search
yarn context -u  # Update mode
```

**Refresh All Context Files:**
```bash
yarn refresh-context
# Uses Claude Code CLI to regenerate CONTEXT.md files
```

**Purpose:**
- AI-friendly documentation
- Quick context for developers
- Automated documentation updates

---

### 3. Build Commands

**Build Everything (Incremental):**
```bash
yarn build
# LazyRepo builds only changed packages
```

**Build SDK Packages Only:**
```bash
yarn build-package
# Builds @tldraw/* packages
```

**Build tldraw.com Client:**
```bash
yarn build-app
# Production build of frontend
```

**Build Documentation:**
```bash
yarn build-docs
# Static site generation
```

**Key Points:**
- LazyRepo caching speeds up builds
- Workspace dependencies handled automatically
- Parallel execution where possible

---

### 4. Testing Commands

**Run Tests in Package:**
```bash
cd packages/editor
yarn test run
# Runs all tests in editor package
```

**Filter Tests:**
```bash
yarn test run --grep "selection"
# Run only tests matching "selection"
```

**E2E Tests (Examples):**
```bash
yarn e2e
# Playwright E2E for examples app
```

**E2E Tests (tldraw.com):**
```bash
yarn e2e-dotcom
# Playwright E2E for tldraw.com
```

**Type Checking:**
```bash
yarn typecheck
# Type check all packages
# CRITICAL: Run before commits
```

**Linting:**
```bash
yarn lint
# Lint all packages
```

---

## API Entry Points

### 1. Editor API (Programmatic)

**Accessing the Editor:**
```typescript
import { useEditor } from 'tldraw'

function MyComponent() {
  const editor = useEditor()

  // Now have full API access
}
```

**Shape Operations:**
```typescript
// Create shape
editor.createShape({
  type: 'geo',
  x: 100,
  y: 100,
  props: { geo: 'rectangle', w: 200, h: 100 }
})

// Update shape
editor.updateShape(shapeId, { x: 150 })

// Delete shapes
editor.deleteShapes([shapeId])

// Get shape
const shape = editor.getShape(shapeId)

// Get all shapes
const shapes = editor.getCurrentPageShapes()
```

**Selection API:**
```typescript
// Select shapes
editor.select(shapeId1, shapeId2)

// Select all
editor.selectAll()

// Deselect all
editor.selectNone()

// Get selected shapes
const selected = editor.getSelectedShapes()

// Get selection bounds
const bounds = editor.getSelectionPageBounds()
```

**Camera API:**
```typescript
// Set camera position
editor.setCamera({ x: 0, y: 0, z: 1 })

// Zoom in/out
editor.zoomIn()
editor.zoomOut()

// Zoom to fit
editor.zoomToFit()

// Zoom to selection
editor.zoomToSelection()

// Get viewport bounds
const viewport = editor.getViewportPageBounds()
```

**History API:**
```typescript
// Undo/redo
editor.undo()
editor.redo()

// Create mark (checkpoint)
editor.mark('before-operation')

// Bail to mark
editor.bailToMark('before-operation')

// Bail (undo to last mark)
editor.bail()
```

**Tool API:**
```typescript
// Set current tool
editor.setCurrentTool('select')
editor.setCurrentTool('geo')

// Get current tool
const tool = editor.getCurrentTool()
```

**Event API:**
```typescript
// Listen to events
editor.on('change', (change) => {
  console.log('Editor changed:', change)
})

// Emit custom events
editor.emit('my-event', { data: '...' })

// Remove listener
editor.off('change', handler)
```

---

### 2. Store API

**Accessing the Store:**
```typescript
const store = editor.store
```

**Record Operations:**
```typescript
// Put records (create/update)
store.put([{ id, type, ...props }])

// Remove records
store.remove([id1, id2])

// Get record
const record = store.get(id)

// Check existence
const exists = store.has(id)

// Get all records
const all = store.allRecords()
```

**Query API:**
```typescript
// Get records by type
const shapes = store.query.records('shape')

// Get reactive index
const shapesByType = store.query.index('shape', 'type')

// Use index
const geoShapes = shapesByType.get().get('geo')
```

**Listeners:**
```typescript
// Listen to all changes
const unlisten = store.listen((entry) => {
  console.log('Store changed:', entry.changes)
})

// Clean up
unlisten()
```

---

### 3. Asset API

**Register Asset Handlers:**
```typescript
// URL handler (bookmarks)
editor.registerExternalAssetHandler('url', async ({ url }) => {
  const response = await fetch('/api/unfurl', {
    method: 'POST',
    body: JSON.stringify({ url })
  })
  const data = await response.json()

  return {
    type: 'bookmark',
    props: {
      url,
      title: data.title,
      description: data.description,
      image: data.image
    }
  }
})

// File handler (images)
editor.registerExternalAssetHandler('file', async ({ file }) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  const data = await response.json()

  return {
    type: 'image',
    props: {
      src: data.url,
      w: data.width,
      h: data.height
    }
  }
})
```

---

## HTTP Entry Points (tldraw.com)

### Frontend Routes

**Landing/TLA:**
```
GET /
- Redirects to file browser or landing
```

**Create New File:**
```
GET /new
- Creates new file
- Redirects to /f/:fileId
```

**File Editor:**
```
GET /f/:fileId
- Opens file in editor
- Loads from server or local
```

**File History:**
```
GET /f/:fileId/h
- View file history
- Snapshots and versions
```

**History Snapshot:**
```
GET /f/:fileId/h/:vsId
- View specific snapshot
```

**Publish:**
```
GET /publish
- Publishing flow
```

**Legacy Routes (Compatibility):**
```
/r/:roomId - Redirect to new format
/ro/:roomId - Readonly redirect
/s/:roomId - Snapshot redirect
/v/:roomId - Old readonly format
```

---

### WebSocket Endpoints

**Sync Connection:**
```
wss://sync.tldraw.com/connect

Query Parameters:
- sessionId: Browser tab ID
- storeId: Store instance ID
- roomId: Room identifier (optional)

Protocol:
- Binary WebSocket messages
- Operational Transform protocol
- Presence updates
```

---

### Worker API Endpoints

**Asset Upload:**
```
POST /uploads/:objectName

Body: File binary
Returns: { src: string }

Worker: asset-upload-worker
Storage: R2
```

**Image Optimization:**
```
GET /images/:imageId?w=800&h=600

Parameters:
- w: Width
- h: Height
- format: avif, webp, jpg

Worker: image-resize-worker
Returns: Optimized image
```

**Bookmark Unfurl:**
```
POST /bookmarks/unfurl

Body: { url: string }
Returns: { title, description, image, favicon }

Worker: sync-worker
```

---

## Environment Configuration

### Development Environment

**`.env.development`:**
```bash
# Application
VITE_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://localhost/tldraw_dev

# Clerk Auth
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_SECRET_KEY=sk_test_...

# Workers (local)
VITE_ASSET_UPLOAD_URL=http://localhost:8787
VITE_SYNC_URL=ws://localhost:8788
```

---

### Production Environment

**`.env.production`:**
```bash
# Application
VITE_APP_URL=https://tldraw.com

# CDN
CDN_URL=https://cdn.tldraw.com

# Monitoring
SENTRY_DSN=https://...
VITE_POSTHOG_KEY=phc_...

# Database
DATABASE_URL=postgresql://prod-db/tldraw

# Clerk Auth
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

---

### Worker Environment

**`wrangler.toml`:**
```toml
name = "tldraw-sync-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "ROOMS", class_name = "TLDrawDurableObject" }
]

[[r2_buckets]]
binding = "ASSET_BUCKET"
bucket_name = "tldraw-assets"

[[kv_namespaces]]
binding = "KV"
id = "..."
```

---

## Summary of Entry Points by User Type

### SDK Users
- `npm install tldraw` → `<Tldraw />`
- Documentation: tldraw.dev
- Examples: examples app

### Contributors
- `yarn dev` - Examples development
- `yarn dev-app` - tldraw.com development
- `yarn test run` - Testing
- `yarn typecheck` - Type checking

### Framework Integrators
- `npm create tldraw` - Quick start
- Templates - Framework-specific examples
- API documentation - tldraw.dev/api

### tldraw.com Users
- Web: tldraw.com
- Routes: /, /new, /f/:id
- Multiplayer: WebSocket sync

### System Administrators
- Worker deployment - Cloudflare
- Database - PostgreSQL
- Asset storage - R2
- Monitoring - Sentry, PostHog
