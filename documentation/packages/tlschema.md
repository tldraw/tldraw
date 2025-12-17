---
title: "@tldraw/tlschema"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - schema
  - types
  - validation
  - migration
  - shapes
  - records
---

The `@tldraw/tlschema` package defines the type system, validation schemas, and migrations for all persisted data in tldraw. It provides the complete data model that powers the editor, including shapes, assets, pages, and user state.

## Overview

This package is the central source of truth for tldraw's data structures. Every record type in tldraw—from shapes and assets to pages and user state—is defined, validated, and versioned here.

Key responsibilities:

- Define all record types and their TypeScript interfaces
- Provide runtime validation for every piece of persisted data
- Manage schema evolution through migrations
- Coordinate the style system for consistent styling across shapes
- Handle asset management interfaces

Use this package when:

- Creating custom shapes or bindings with proper type safety
- Defining custom style properties that work across shapes
- Working with tldraw data outside the editor context
- Building tools that need to understand tldraw's data model

The schema is designed to evolve over time while maintaining backward compatibility through a robust migration system.

## Record type hierarchy

At the core of tlschema is the `TLRecord` union type, which encompasses all record types in a tldraw document:

```typescript
type TLRecord =
  | TLAsset       // Images, videos, bookmarks
  | TLBinding     // Connections between shapes
  | TLCamera      // Viewport state per page
  | TLDocument    // Root document metadata
  | TLInstance    // User instance state
  | TLInstancePageState  // Per-page user state
  | TLPage        // Document pages
  | TLShape       // All shape types
  | TLInstancePresence   // Real-time presence
  | TLPointer     // Mouse/touch state
```

### Record scopes

Records are organized into scopes that determine their sync and persistence behavior:

| Scope | Synced | Persisted | Examples |
|-------|--------|-----------|----------|
| `document` | Yes | Yes | Shapes, assets, pages, bindings |
| `session` | No | Maybe | User preferences, instance state |
| `presence` | Yes | No | Cursors, selections, active users |

Document-scoped records form the core document data. Session-scoped records track per-user state. Presence records enable real-time collaboration without persistence.

## Creating a schema

The `createTLSchema()` function builds a complete schema with all record types, validators, and migrations:

```typescript
import { createTLSchema, defaultShapeSchemas, defaultBindingSchemas } from '@tldraw/tlschema'
import { Store } from '@tldraw/store'

// Create schema with all defaults
const schema = createTLSchema()

// Create schema with custom shapes
const customSchema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    myShape: {
      props: myShapeProps,
      migrations: myShapeMigrations,
    },
  },
  bindings: defaultBindingSchemas,
})

// Use with a store
const store = new Store({
  schema: customSchema,
  props: {
    defaultName: 'My Drawing',
    assets: myAssetStore,
    onMount: (editor) => console.log('Mounted'),
  },
})
```

The schema factory:

- Collects all shape types and their validators
- Extracts style properties for centralized tracking
- Coordinates migrations across all record types
- Sets up integrity checking for store consistency

## Shape system

### Base shape structure

All shapes extend `TLBaseShape`, which defines common properties:

```typescript
interface TLBaseShape<Type extends string, Props extends object> {
  id: TLShapeId
  typeName: 'shape'
  type: Type

  // Transform properties
  x: number
  y: number
  rotation: number

  // Organization properties
  index: IndexKey        // Fractional index for ordering
  parentId: TLParentId   // Page or parent shape
  isLocked: boolean
  opacity: TLOpacityType

  // Custom data
  props: Props          // Shape-specific properties
  meta: JsonObject      // User-defined metadata
}
```

The parent ID determines where the shape lives. It can reference either a page (`page:abc123`) or another shape like a frame or group (`shape:frame1`).

### Defining custom shapes

Create a custom shape by defining its interface, props validator, and migrations:

```typescript
import { TLBaseShape, createShapeValidator, RecordProps } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// 1. Define shape interface
interface TLCustomShape extends TLBaseShape<'custom', TLCustomShapeProps> {}

interface TLCustomShapeProps {
  // Use existing style props
  color: TLDefaultColorStyle
  size: TLDefaultSizeStyle

  // Add custom properties
  width: number
  height: number
  label: string
}

// 2. Create props validator
const customShapeProps: RecordProps<TLCustomShape> = {
  color: DefaultColorStyle,
  size: DefaultSizeStyle,
  width: T.number,
  height: T.number,
  label: T.string,
}

// 3. Define migrations
const customShapeMigrations = createShapePropsMigrationSequence({
  sequenceId: 'com.myapp.shape.custom',
  sequence: [
    {
      id: 'com.myapp.shape.custom/1.0.0',
      up: (props) => ({ ...props, label: '' }),
      down: ({ label, ...props }) => props,
    },
  ],
})

// 4. Register in schema
const schema = createTLSchema({
  shapes: {
    ...defaultShapeSchemas,
    custom: {
      props: customShapeProps,
      migrations: customShapeMigrations,
    },
  },
})
```

### Default shapes

The package includes schemas for all built-in shapes:

| Shape type | Purpose | Key properties |
|-----------|---------|---------------|
| `arrow` | Directional lines with bindings | `start`, `end`, `bend`, bindings |
| `bookmark` | Website preview cards | `url`, `title`, `description`, `favicon` |
| `draw` | Freehand drawing paths | `segments`, `isClosed`, `isComplete` |
| `embed` | External content embeds | `url`, `w`, `h` |
| `frame` | Container for organizing shapes | `w`, `h`, `name` |
| `geo` | Geometric shapes | `geo` type, `w`, `h`, `richText` |
| `group` | Logical shape grouping | Minimal props |
| `highlight` | Highlighter strokes | `segments`, `color`, `size` |
| `image` | Raster images | `assetId`, `w`, `h`, `crop` |
| `line` | Multi-point lines | `points`, `spline` type |
| `note` | Sticky notes | `color`, `size`, `richText` |
| `text` | Rich text | `richText`, `w`, auto-size |
| `video` | Video players | `assetId`, `w`, `h` |

Each shape type is fully configured in `defaultShapeSchemas` with its props and migrations.

## Style system

### Style properties

`StyleProp` defines properties that can be shared across shapes and persist as "last used" values:

```typescript
import { StyleProp } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// Define a free-form style property
const MyLineWidthProp = StyleProp.define('myapp:lineWidth', {
  defaultValue: 1,
  type: T.number,
})

// Define an enum-based style property
const MySizeProp = StyleProp.defineEnum('myapp:size', {
  defaultValue: 'medium',
  values: ['small', 'medium', 'large'],
})
```

Style properties have special behavior:

1. Setting a style on selected shapes applies it to all
2. The last used value is automatically saved
3. New shapes receive the last used value by default
4. The editor tracks all style properties globally

### Default styles

The package provides a complete set of default styles:

```typescript
// Color styles with theme support
DefaultColorStyle        // Shape colors
DefaultLabelColorStyle   // Text label colors

// Visual styles
DefaultDashStyle         // 'solid' | 'dashed' | 'dotted' | 'draw'
DefaultFillStyle         // 'none' | 'solid' | 'semi' | 'pattern'
DefaultSizeStyle         // 's' | 'm' | 'l' | 'xl'
DefaultFontStyle         // 'draw' | 'sans' | 'serif' | 'mono'

// Alignment styles
DefaultHorizontalAlignStyle  // 'start' | 'middle' | 'end'
DefaultVerticalAlignStyle    // 'start' | 'middle' | 'end'

// Shape-specific styles
GeoShapeGeoStyle        // Geometric shape variants
ArrowShapeArrowheadStyle // Arrow head types
```

### Theme integration

Colors adapt to light and dark themes through `TLDefaultColorTheme`:

```typescript
// Color values change based on theme
const theme: TLDefaultColorTheme = {
  id: 'light',
  text: 'black',
  background: 'white',
  solid: '#1d4ed8',    // Adapts in dark mode
  // ... more theme colors
}
```

Shapes using `DefaultColorStyle` automatically receive theme-appropriate colors without additional code.

## Asset system

### Asset types

Three asset types handle media content:

```typescript
// Image assets
interface TLImageAsset {
  type: 'image'
  props: {
    src: string           // Image URL
    w: number             // Native width
    h: number             // Native height
    mimeType: string      // e.g., 'image/png'
    isAnimated: boolean   // For GIFs
  }
}

// Video assets
interface TLVideoAsset {
  type: 'video'
  props: {
    src: string           // Video URL
    w: number             // Native width
    h: number             // Native height
    mimeType: string      // e.g., 'video/mp4'
    thumbnailSrc?: string // Preview thumbnail
  }
}

// Bookmark assets
interface TLBookmarkAsset {
  type: 'bookmark'
  props: {
    src: string           // Page URL
    title?: string        // Page title
    description?: string  // Meta description
    image?: string        // Preview image
    favicon?: string      // Site favicon
  }
}
```

### Asset store interface

The `TLAssetStore` interface defines how assets are stored and retrieved:

```typescript
interface TLAssetStore {
  // Upload an asset file
  upload(
    asset: TLAsset,
    file: File,
    abortSignal?: AbortSignal
  ): Promise<{ src: string; meta?: JsonObject }>

  // Resolve asset URL for rendering
  resolve?(
    asset: TLAsset,
    ctx: TLAssetContext
  ): Promise<string | null> | string | null

  // Clean up removed assets
  remove?(assetIds: TLAssetId[]): Promise<void>
}
```

Example implementation:

```typescript
const assetStore: TLAssetStore = {
  async upload(asset, file) {
    // Upload to S3, convert to data URL, etc.
    const url = await uploadToStorage(file)
    return { src: url }
  },

  async resolve(asset, context) {
    // Optimize based on context
    if (context.networkEffectiveType === 'slow-2g') {
      return `${asset.props.src}?quality=low`
    }
    if (context.dpr > 1) {
      return `${asset.props.src}@2x`
    }
    return asset.props.src
  },

  async remove(assetIds) {
    // Clean up storage
    await deleteFromStorage(assetIds)
  },
}
```

The `TLAssetContext` provides optimization hints:

- `screenScale`: How large the asset appears relative to native size
- `dpr`: Device pixel ratio for retina displays
- `networkEffectiveType`: Connection speed estimate
- `shouldResolveToOriginal`: When exporting or copying

## Binding system

Bindings represent relationships between shapes. The primary use case is arrows connected to other shapes.

### Binding structure

```typescript
interface TLBaseBinding<Type extends string, Props extends object> {
  id: TLBindingId
  typeName: 'binding'
  type: Type

  // Connected shapes
  fromId: TLShapeId
  toId: TLShapeId

  props: Props
  meta: JsonObject
}
```

### Arrow bindings

Arrow bindings connect arrow shapes to other shapes with precise positioning:

```typescript
interface TLArrowBindingProps {
  terminal: 'start' | 'end'      // Which arrow end is bound
  normalizedAnchor: VecModel     // Position on target shape (0-1)
  isExact: boolean               // Precise vs approximate positioning
  isPrecise: boolean             // Show binding indicator
}
```

When a shape with arrow bindings moves, the arrows automatically update to maintain connections.

### Custom bindings

Create custom bindings following the same pattern as shapes:

```typescript
interface TLCustomBinding extends TLBaseBinding<'custom', TLCustomBindingProps> {}

interface TLCustomBindingProps {
  strength: number
  bidirectional: boolean
}

const customBindingProps: RecordProps<TLCustomBinding> = {
  strength: T.number,
  bidirectional: T.boolean,
}

// Register in schema
const schema = createTLSchema({
  bindings: {
    ...defaultBindingSchemas,
    custom: {
      props: customBindingProps,
      migrations: customBindingMigrations,
    },
  },
})
```

## Validation patterns

The package uses `@tldraw/validate` for runtime type checking with TypeScript inference.

### Basic validators

```typescript
import { T } from '@tldraw/validate'

// Primitive types
T.string
T.number
T.boolean
T.null
T.undefined

// Complex types
T.array(T.string)
T.object({ name: T.string, age: T.number })
T.union([T.string, T.number])
T.optional(T.string)

// Custom validators
T.string.refine((s) => {
  if (s.length > 100) throw new Error('Too long')
  return s
})
```

### Shape validators

Use `createShapeValidator()` to validate complete shape records:

```typescript
import { createShapeValidator } from '@tldraw/tlschema'

const validator = createShapeValidator('custom', {
  width: T.number,
  height: T.number,
  color: T.string,
})

// Validates the entire shape including base properties
const validatedShape = validator.validate(shapeData)
```

### Custom type validators

For complex types like rich text or geometry, define custom validators:

```typescript
import { T } from '@tldraw/validate'

const richTextValidator = T.object({
  type: T.literal('richText'),
  text: T.string,
  format: T.optional(T.array(T.object({
    type: T.string,
    start: T.number,
    end: T.number,
  }))),
})
```

### Validation performance

The validation system includes optimizations:

- `validateUsingKnownGoodVersion()`: Fast path when previous value was valid
- Development vs production modes: More thorough validation in development
- Lazy validation: Only validates on store operations, not every read

## Migration system

Migrations handle schema evolution while maintaining backward compatibility.

### Migration types

Three levels of migrations work together:

```typescript
// 1. Store-level migrations (structural changes)
const storeMigrations = createMigrationSequence({
  sequenceId: 'com.tldraw.store',
  recordType: 'store',
  sequence: [/* migrations */],
})

// 2. Record-level migrations (record structure)
const recordMigrations = createMigrationSequence({
  sequenceId: 'com.tldraw.shape',
  recordType: 'shape',
  sequence: [/* migrations */],
})

// 3. Props migrations (shape/binding properties)
const propsMigrations: TLPropsMigrations = {
  sequence: [
    {
      id: 'com.myapp.shape.custom/1.0.0',
      up: (props) => ({ ...props, newProp: 'default' }),
      down: ({ newProp, ...props }) => props,
    },
  ],
}
```

### Writing migrations

Each migration has an ID, `up` function, and optional `down` function:

```typescript
const addColorMigration = {
  id: 'com.myapp.shape.custom/1.0.0',

  // Upgrade: add new property
  up: (props) => {
    return { ...props, color: 'black' }
  },

  // Downgrade: remove property
  down: (props) => {
    const { color, ...rest } = props
    return rest
  },
}

const renamePropertyMigration = {
  id: 'com.myapp.shape.custom/1.1.0',

  up: (props) => {
    const { oldName, ...rest } = props
    return { ...rest, newName: oldName }
  },

  down: (props) => {
    const { newName, ...rest } = props
    return { ...rest, oldName: newName }
  },
}
```

### Migration best practices

1. Use descriptive IDs with version numbers
2. Always test both up and down migrations
3. Handle missing properties gracefully
4. Group related changes into single migrations
5. Consider data transformation complexity

```typescript
// Good: Handle optional properties
up: (props) => ({
  ...props,
  newProp: props.oldProp ?? 'default',
})

// Good: Compute derived values
up: (props) => ({
  ...props,
  area: props.width * props.height,
})

// Avoid: Complex transformations that might fail
up: (props) => ({
  ...props,
  // Fragile if structure changes
  parsed: JSON.parse(props.serialized),
})
```

### Migration coordination

The schema coordinates all migrations in the correct order:

1. Store migrations run first
2. Record type migrations run next
3. Props migrations run for each record type
4. Asset migrations run for asset subtypes

Dependencies between migrations are tracked automatically through `dependsOn` declarations.

## Store integration

### Creating a store

The schema plugs into the store system:

```typescript
import { Store } from '@tldraw/store'
import { createTLSchema } from '@tldraw/tlschema'

const schema = createTLSchema()

const store = new Store({
  schema,
  props: {
    defaultName: 'Untitled',
    assets: assetStore,
    onMount: (editor) => {
      console.log('Editor mounted')
      return () => console.log('Editor unmounted')
    },
  },
})
```

### Store props

`TLStoreProps` configure store behavior:

```typescript
interface TLStoreProps {
  // Default name for new documents
  defaultName: string

  // Asset storage implementation
  assets: Required<TLAssetStore>

  // Called when editor mounts
  onMount(editor: unknown): void | (() => void)

  // Optional collaboration config
  collaboration?: {
    status: Signal<'online' | 'offline'> | null
    mode?: Signal<'readonly' | 'readwrite'> | null
  }
}
```

### Integrity checking

The schema includes an integrity checker that ensures consistency:

- Validates required records exist (document, pointer)
- Ensures at least one page exists
- Fixes invalid shape references in selections
- Creates missing cameras and page states
- Removes orphaned records

The integrity checker runs automatically when the store loads and after certain operations.

### Validation failures

The `onValidationFailure` handler manages invalid records:

```typescript
// During store initialization, allow existing invalid data
// During updates, throw errors for invalid data
function onValidationFailure({ error, phase, record }) {
  if (phase === 'initialize') {
    // Allow loading old buggy data
    console.warn('Invalid record during init:', record)
    return record
  }

  // Throw for new invalid data
  throw error
}
```

This allows loading documents with historical validation issues while preventing new problems.

## Persistence and serialization

### Store snapshots

Capture complete store state:

```typescript
// Create snapshot
const snapshot: TLStoreSnapshot = store.getSnapshot()

// Serialize to JSON
const json = JSON.stringify(snapshot)
localStorage.setItem('drawing', json)

// Restore from snapshot
const restored = JSON.parse(json)
store.loadSnapshot(restored)
```

### Serialized stores

For network transmission:

```typescript
// Serialize for transmission
const serialized: TLSerializedStore = store.serialize()

// Send over network
await fetch('/api/save', {
  method: 'POST',
  body: JSON.stringify(serialized),
})

// Deserialize on other end
const data = await response.json()
store.deserialize(data)
```

### Migration on load

When loading data, migrations run automatically:

1. Detect the schema version of the stored data
2. Determine required migrations to reach current version
3. Apply migrations in sequence
4. Validate the migrated data

If migrations fail, the load operation throws an error with details.

## Key files

- packages/tlschema/src/TLStore.ts - Store type, props, integrity checker
- packages/tlschema/src/createTLSchema.ts - Schema factory and defaults
- packages/tlschema/src/records/TLRecord.ts - Root record union type
- packages/tlschema/src/records/TLShape.ts - Shape record system
- packages/tlschema/src/records/TLAsset.ts - Asset record system
- packages/tlschema/src/records/TLBinding.ts - Binding record system
- packages/tlschema/src/shapes/TLBaseShape.ts - Base shape interface
- packages/tlschema/src/shapes/TLGeoShape.ts - Example shape implementation
- packages/tlschema/src/styles/StyleProp.ts - Style property system
- packages/tlschema/src/styles/TLColorStyle.ts - Color style implementation
- packages/tlschema/src/recordsWithProps.ts - Props validation utilities
- packages/tlschema/src/store-migrations.ts - Historical store migrations
- packages/tlschema/src/assets/ - Asset type definitions
- packages/tlschema/src/shapes/ - All shape type definitions
- packages/tlschema/src/styles/ - All style property definitions
- packages/tlschema/src/misc/TLRichText.ts - Rich text type system

## Related

- [@tldraw/store](./store.md) - Reactive database powering tlschema
- [@tldraw/validate](./validate.md) - Runtime validation system
- [@tldraw/editor](./editor.md) - Editor that uses tlschema
