# Namespaced-Tldraw Package Context

## Overview
The `@tldraw/tldraw` package is a legacy compatibility wrapper that re-exports the main `tldraw` package while adding global library registration. It exists primarily for backwards compatibility and CDN/global usage scenarios where version tracking is important.

## Architecture

### Legacy Compatibility Layer
Simple re-export pattern with version registration:
```typescript
import { registerTldrawLibraryVersion } from 'tldraw'
export * from 'tldraw'

// Register version info for global usage tracking
registerTldrawLibraryVersion(
  (globalThis as any).TLDRAW_LIBRARY_NAME,
  (globalThis as any).TLDRAW_LIBRARY_VERSION, 
  (globalThis as any).TLDRAW_LIBRARY_MODULES
)
```

### Package Structure
```
namespaced-tldraw/
├── src/
│   └── index.ts              # Re-export + version registration
├── scripts/
│   └── copy-css-files.mjs    # CSS file synchronization
├── tldraw.css                # Copied CSS from main package
├── dist-cjs/                 # CommonJS distribution
├── dist-esm/                 # ES modules distribution
└── api/                      # API documentation
```

## Distribution Strategy

### Multiple Output Formats
Supports various consumption patterns:
```json
{
  "main": "./dist-cjs/index.js",     // CommonJS for Node.js
  "module": "./dist-esm/index.mjs",  // ES modules for bundlers
  "types": "./dist-cjs/index.d.ts",  // TypeScript definitions
  "files": ["tldraw.css"]            // Include CSS in package
}
```

### CSS Asset Management
Automated CSS synchronization from main package:
```javascript
// scripts/copy-css-files.mjs
import { readFileSync, writeFileSync } from 'fs'

// Copy CSS from main tldraw package
const content = readFileSync('../tldraw/tldraw.css', 'utf8')
writeFileSync('./tldraw.css', content)
```

**Build Integration:**
```json
{
  "predev": "node ./scripts/copy-css-files.mjs",
  "dev": "chokidar '../tldraw/tldraw.css' -c 'node ./scripts/copy-css-files.mjs'",
  "prebuild": "node ./scripts/copy-css-files.mjs"
}
```

## Global Usage Support

### Version Registration System
Enables version tracking for CDN and global usage:
```typescript
// Library version info injected by build system
declare global {
  var TLDRAW_LIBRARY_NAME: string
  var TLDRAW_LIBRARY_VERSION: string  
  var TLDRAW_LIBRARY_MODULES: string[]
}

// Registration happens on module load
registerTldrawLibraryVersion(
  globalThis.TLDRAW_LIBRARY_NAME,     // Package identifier
  globalThis.TLDRAW_LIBRARY_VERSION,  // Semantic version
  globalThis.TLDRAW_LIBRARY_MODULES   // Included modules list
)
```

### CDN Integration Patterns
Designed for script tag and global usage:
```html
<!-- CDN usage -->
<script src="https://unpkg.com/@tldraw/tldraw"></script>
<link rel="stylesheet" href="https://unpkg.com/@tldraw/tldraw/tldraw.css">

<script>
  // Access via global namespace
  const { Tldraw } = window.Tldraw
  
  // Version tracking automatically enabled
  console.log('tldraw version:', window.TLDRAW_LIBRARY_VERSION)
</script>
```

## Package Dependencies

### Minimal Dependency Chain
Single dependency on core tldraw package:
```json
{
  "dependencies": {
    "tldraw": "workspace:*"  // Re-export main package
  },
  "peerDependencies": {
    "react": "^18.2.0 || ^19.0.0",
    "react-dom": "^18.2.0 || ^19.0.0"
  }
}
```

### Development Dependencies
Build and development tooling:
```json
{
  "devDependencies": {
    "@types/react": "^18.3.18",
    "chokidar-cli": "^3.0.0",      // CSS file watching
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

## Build System

### Dual Package Exports
Support for both CommonJS and ES modules:
```
dist-cjs/
├── index.js          # CommonJS entry point
├── index.d.ts        # CommonJS type definitions
└── index.js.map      # Source maps

dist-esm/
├── index.mjs         # ES module entry point  
├── index.d.mts       # ES module type definitions
└── index.mjs.map     # Source maps
```

### API Documentation
Automated API extraction and documentation:
```
api/
├── api.json          # Machine-readable API surface
├── public.d.ts       # Public API definitions
├── internal.d.ts     # Internal API definitions
└── temp/
    └── api-report.api.md  # Human-readable API report
```

### CSS Synchronization
Automatic CSS file copying with watch mode:
```javascript
// Development: Watch for CSS changes
"dev": "chokidar '../tldraw/tldraw.css' -c 'node ./scripts/copy-css-files.mjs'"

// Build: Ensure CSS is current
"prebuild": "node ./scripts/copy-css-files.mjs"
```

## Legacy Support

### Migration Path
Smooth transition for existing users:
```typescript
// Old usage (still works)
import { Tldraw } from '@tldraw/tldraw'

// New recommended usage  
import { Tldraw } from 'tldraw'

// Both import the exact same functionality
```

### Backwards Compatibility
Maintains full API compatibility:
- **Same Exports**: Identical API surface as main package
- **Same Types**: TypeScript definitions preserved
- **Same CSS**: Styling rules synchronized
- **Same Behavior**: Functional parity guaranteed

## Use Cases

### CDN Distribution
Global script tag usage for quick prototyping:
```html
<script src="https://unpkg.com/@tldraw/tldraw@latest/dist-cjs/index.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@tldraw/tldraw@latest/tldraw.css">
```

### Legacy Projects
Existing codebases that depend on `@tldraw/tldraw` naming:
```typescript
// Existing imports continue to work
import { Tldraw, Editor, createShapeId } from '@tldraw/tldraw'

// No code changes required for migration
```

### Version Monitoring
Applications that need to track tldraw version usage:
```typescript
// Access version information at runtime
const libraryInfo = {
  name: window.TLDRAW_LIBRARY_NAME,
  version: window.TLDRAW_LIBRARY_VERSION,
  modules: window.TLDRAW_LIBRARY_MODULES
}

// Useful for analytics, debugging, feature detection
```

## Development Workflow

### CSS Synchronization
Automatic CSS file management during development:
```bash
# Development mode - watch for CSS changes
yarn dev  # Monitors ../tldraw/tldraw.css for changes

# Build mode - ensure CSS is current
yarn build  # Copies CSS before building distributions
```

### Testing Environment
Inherited test configuration from main tldraw package:
```json
{
  "testEnvironment": "../../../packages/utils/patchedJestJsDom.js",
  "setupFiles": ["raf/polyfill", "jest-canvas-mock"],
  "moduleNameMapper": {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy"
  }
}
```

## Migration Guidance

### For New Projects
```typescript
// Recommended: Use main package
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
```

### For Existing Projects
```typescript
// Current: Legacy package (still supported)
import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// Migration: Update imports when convenient
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
```

## Key Benefits

### Backwards Compatibility
- **Zero Breaking Changes**: Existing code continues to work
- **Gradual Migration**: Update imports at your own pace
- **Feature Parity**: Identical functionality to main package
- **Documentation Continuity**: Same API documentation applies

### Global Usage
- **CDN Friendly**: Optimized for script tag inclusion
- **Version Tracking**: Runtime version information available
- **Namespace Safety**: Avoids global namespace conflicts
- **Browser Compatibility**: Works in all modern browsers

### Maintenance
- **Automated Sync**: CSS and exports stay current with main package
- **Single Source**: No duplicate implementation to maintain
- **Version Alignment**: Always matches main package version
- **Testing Coverage**: Inherits test suite from main package

### Ecosystem
- **NPM Compatibility**: Standard npm package structure
- **Bundler Support**: Works with all major bundlers
- **TypeScript Ready**: Full type safety maintained
- **Documentation**: API docs generated automatically