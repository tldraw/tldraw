# CONTEXT.md - @tldraw/tlschema Package

This file provides comprehensive context for understanding the `@tldraw/tlschema` package, which defines the type system, data schemas, and migrations for tldraw's persisted data.

## Package Overview

`@tldraw/tlschema` is the central type definition and schema management package for tldraw. It defines all record types (shapes, assets, pages, etc.), their validation schemas, migration sequences, and the overall data model that powers the tldraw editor.

**Core Purpose:** Provide a complete, type-safe, and version-aware data model for tldraw that can evolve over time while maintaining backward compatibility.

## Architecture Overview

### Record System Hierarchy

**TLRecord Union (`src/records/TLRecord.ts`):**

```typescript
type TLRecord =
	| TLAsset // Images, videos, bookmarks
	| TLBinding // Connections between shapes (arrows)
	| TLCamera // Viewport state per page
	| TLDocument // Root document metadata
	| TLInstance // User instance state
	| TLInstancePageState // Per-page user state
	| TLPage // Document pages
	| TLShape // All shape types
	| TLInstancePresence // Real-time presence
	| TLPointer // Mouse/touch state
```

### Store System Foundation

**TLStore (`src/TLStore.ts`):**

- Type alias for `Store<TLRecord, TLStoreProps>`
- `TLStoreProps` includes asset store integration and editor mounting
- `createIntegrityChecker()` ensures store consistency (pages, cameras, states)
- Error redaction for sensitive data (asset URLs)

**TLSchema Creation (`src/createTLSchema.ts`):**

- `createTLSchema()` factory for building schemas with custom shapes/bindings
- `defaultShapeSchemas` - All built-in shape configurations
- `defaultBindingSchemas` - Built-in binding configurations
- Automatic migration sequence coordination

### Shape System Architecture

**Base Shape Structure (`src/shapes/TLBaseShape.ts`):**

```typescript
interface TLBaseShape<Type extends string, Props extends object> {
	id: TLShapeId
	type: Type
	x: number
	y: number
	rotation: number
	index: IndexKey // Fractional index for ordering
	parentId: TLParentId // Page or parent shape
	isLocked: boolean
	opacity: TLOpacityType
	props: Props // Shape-specific properties
	meta: JsonObject // User-defined metadata
}
```

**Shape Types (`src/shapes/`):**

- **Basic Shapes:** Geo (rectangles, circles, etc.), Text, Note, Frame, Group
- **Drawing Shapes:** Draw (freehand), Line (multi-point), Highlight
- **Media Shapes:** Image, Video, Bookmark, Embed
- **Complex Shapes:** Arrow (with bindings)

**Shape Props Pattern:**
Each shape defines:

- Props interface with styled and regular properties
- Props validation object using `@tldraw/validate`
- Migration sequence for schema evolution
- Style property integration

### Style System

**StyleProp Architecture (`src/styles/StyleProp.ts`):**

- Base class for properties that can be applied across multiple shapes
- Last-used value persistence for consistent styling
- Enum-based and free-form style properties
- Automatic validation and type safety

**Default Style Properties:**

- `DefaultColorStyle` - Shape and text colors with theme support
- `DefaultDashStyle` - Stroke patterns (solid, dashed, dotted)
- `DefaultFillStyle` - Fill patterns (none, solid, semi, pattern)
- `DefaultSizeStyle` - Size variants (s, m, l, xl)
- `DefaultFontStyle` - Typography (draw, sans, serif, mono)
- Alignment styles (horizontal, vertical, text)

**Theme System:**

- `TLDefaultColorTheme` with light/dark variants
- Color palette with semantic naming
- CSS custom properties integration
- Frame and note-specific color variants

### Asset System

**Asset Types (`src/assets/`):**

- **TLImageAsset** - Raster images with metadata (size, MIME type, etc.)
- **TLVideoAsset** - Video files with duration and thumbnail info
- **TLBookmarkAsset** - Web page previews with title, description, favicon

**Asset Management:**

- `TLAssetStore` interface for storage abstraction
- Upload/resolve/remove lifecycle management
- `TLAssetContext` for resolution optimization
- Support for data URLs, IndexedDB, and remote storage

### Binding System

**Binding Architecture (`src/bindings/`):**

- `TLBaseBinding` - Base interface for shape connections
- `TLArrowBinding` - Connects arrows to shapes with precise positioning
- Binding creation, validation, and lifecycle management
- Integration with shape deletion and updates

### Validation System

**Validation Infrastructure:**

- Built on `@tldraw/validate` for runtime type checking
- Cascading validation from store → record → props
- Custom validators for complex types (rich text, geometry, etc.)
- Development vs production validation modes

**Validation Patterns:**

- `idValidator<T>()` - Type-safe ID validation
- `createShapeValidator()` - Generic shape validation factory
- Custom prop validators for each shape type
- Meta property validation (user-defined data)

### Migration System

**Migration Architecture:**

- **Store-level migrations** (`src/store-migrations.ts`) - Structural changes
- **Record-level migrations** - Individual record type evolution
- **Props migrations** (`src/recordsWithProps.ts`) - Shape/binding property changes
- **Asset migrations** - Asset schema evolution

**Migration Patterns:**

```typescript
const migrations = createMigrationSequence({
	sequenceId: 'com.tldraw.shape.geo',
	sequence: [
		{
			id: 'com.tldraw.shape.geo/1',
			up: (props) => ({ ...props, newProperty: defaultValue }),
			down: ({ newProperty, ...props }) => props,
		},
	],
})
```

**Migration Coordination:**

- Version-based migration IDs
- Dependency tracking between migrations
- Forward and backward migration support
- Retroactive vs non-retroactive migrations

## Key Data Structures

### Shape Property System

**Properties with Styles:**

```typescript
interface TLGeoShapeProps {
	geo: TLGeoShapeGeoStyle // Style property (shared)
	color: TLDefaultColorStyle // Style property (shared)
	w: number // Regular property (shape-specific)
	h: number // Regular property (shape-specific)
	richText: TLRichText // Complex validated property
}
```

**Style Property Definition:**

```typescript
const GeoShapeGeoStyle = StyleProp.defineEnum('tldraw:geo', {
	defaultValue: 'rectangle',
	values: ['rectangle', 'ellipse', 'triangle' /* ... */],
})
```

### Record Type Creation

**Shape Record Creation:**

```typescript
const GeoShapeRecordType = createRecordType<TLGeoShape>('shape', {
	validator: createShapeValidator('geo', geoShapeProps),
	scope: 'document',
})
```

**Asset Record Creation:**

```typescript
const AssetRecordType = createRecordType<TLAsset>('asset', {
	validator: assetValidator,
	scope: 'document',
}).withDefaultProperties(() => ({ meta: {} }))
```

### Complex Type Patterns

**Rich Text (`src/misc/TLRichText.ts`):**

- Structured text with formatting
- JSON-based representation
- Validation and conversion utilities
- Integration with text shapes

**Geometry Types (`src/misc/geometry-types.ts`):**

- `VecModel` - 2D points with validation
- `BoxModel` - Axis-aligned rectangles
- Integration with editor geometry system

## Development Patterns

### Adding New Shape Types

1. **Define Shape Interface:**

```typescript
interface TLCustomShape extends TLBaseShape<'custom', TLCustomShapeProps> {}

interface TLCustomShapeProps {
	color: TLDefaultColorStyle // Use existing styles
	customProp: string // Shape-specific properties
}
```

2. **Create Props Validation:**

```typescript
const customShapeProps: RecordProps<TLCustomShape> = {
	color: DefaultColorStyle,
	customProp: T.string,
}
```

3. **Define Migrations:**

```typescript
const customShapeMigrations = createShapePropsMigrationSequence({
	sequenceId: 'com.yourapp.shape.custom',
	sequence: [
		/* migration objects */
	],
})
```

4. **Register in Schema:**

```typescript
const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		custom: {
			migrations: customShapeMigrations,
			props: customShapeProps,
		},
	},
})
```

### Adding Style Properties

```typescript
const MyStyleProp = StyleProp.define('myapp:style', {
	defaultValue: 'default',
	type: T.unionWithValidator(['option1', 'option2'], T.string),
})

// Use in shape props
interface MyShapeProps {
	myStyle: T.TypeOf<typeof MyStyleProp>
	// other props...
}

const myShapeProps: RecordProps<MyShape> = {
	myStyle: MyStyleProp,
	// other validators...
}
```

### Migration Best Practices

**Record-level Migration:**

```typescript
const recordMigrations = createRecordMigrationSequence({
	sequenceId: 'com.myapp.myrecord',
	recordType: 'myrecord',
	sequence: [
		{
			id: 'com.myapp.myrecord/1',
			up: (record) => {
				record.newField = computeDefault(record)
				return record
			},
			down: ({ newField, ...record }) => record,
		},
	],
})
```

**Props Migration:**

```typescript
const propsMigrations: TLPropsMigrations = {
	sequence: [
		{
			id: 'com.myapp.shape.custom/1',
			up: (props) => ({ ...props, newProp: 'default' }),
			down: ({ newProp, ...props }) => props,
		},
	],
}
```

## File Organization and Structure

### Core Records (`src/records/`)

- **TLShape.ts** - Base shape system and root migrations (~300 lines)
- **TLAsset.ts** - Asset management and validation (~100 lines)
- **TLBinding.ts** - Shape connection system (~150 lines)
- **TLPage.ts** - Document page structure (~50 lines)
- **TLDocument.ts** - Root document record (~50 lines)
- **TLInstance.ts** - User instance state (~200 lines)
- **TLPageState.ts** - Per-page user state (~150 lines)
- **TLCamera.ts** - Viewport state (~50 lines)
- **TLPresence.ts** - Real-time user presence (~100 lines)
- **TLPointer.ts** - Input device state (~50 lines)

### Shape Implementations (`src/shapes/`)

Each shape file (~100-200 lines) includes:

- TypeScript interface definition
- Props validation object
- Migration sequence
- Type exports and utilities

### Style Definitions (`src/styles/`)

- **StyleProp.ts** - Base style property system (~150 lines)
- Individual style implementations (~50-100 lines each)
- Theme definitions and color palettes
- Validation and type utilities

### Asset Definitions (`src/assets/`)

- Base asset system and individual asset types (~50-100 lines each)
- Upload/resolution interfaces
- Asset-specific validation and metadata

### Support Systems

- **`src/misc/`** - Utility types, validators, and helper functions
- **`src/translations/`** - Internationalization support
- **`src/createPresenceStateDerivation.ts`** - Real-time presence logic
- **`src/store-migrations.ts`** - Historical store structure changes

## Type System Patterns

### ID System

- Strongly typed IDs using branded types
- `RecordId<T>` prevents ID confusion between record types
- Custom ID creation for predictable IDs
- Random ID generation for new records

### Props with Styles

```typescript
// Shapes use a mix of style props and regular props
interface ShapeProps {
	// Style props (shared across shapes, persisted globally)
	color: TLDefaultColorStyle
	size: TLDefaultSizeStyle

	// Regular props (shape-specific)
	width: number
	height: number
	text: string
}
```

### Validation Integration

- All properties validated at runtime
- Custom validation for complex types
- Graceful degradation for unknown properties
- Development vs production validation levels

## Store Integration Points

### Schema Configuration

```typescript
const schema = createTLSchema({
	shapes: customShapeSchemas,
	bindings: customBindingSchemas,
	migrations: additionalMigrations,
})

const store = new Store({
	schema,
	props: {
		defaultName: 'Untitled',
		assets: assetStore,
		onMount: (editor) => {
			/* setup */
		},
	},
})
```

### Asset Store Integration

```typescript
interface TLAssetStore {
	upload(asset: TLAsset, file: File): Promise<{ src: string }>
	resolve?(asset: TLAsset, ctx: TLAssetContext): Promise<string | null>
	remove?(assetIds: TLAssetId[]): Promise<void>
}
```

## Development Guidelines

### Schema Evolution

1. **Always add migrations** when changing persisted data structures
2. **Version changes incrementally** with descriptive names
3. **Test migrations thoroughly** with real-world data
4. **Document breaking changes** and migration requirements
5. **Handle migration failures gracefully** with validation fallbacks

### Shape Development

1. **Follow existing patterns** for props structure and validation
2. **Use style properties** for attributes that should be shared across shapes
3. **Implement proper validation** for all properties including edge cases
4. **Consider performance implications** of complex property validation
5. **Design for extensibility** while maintaining type safety

### Validation Strategy

1. **Use appropriate validators** from `@tldraw/validate`
2. **Implement custom validators** for domain-specific types
3. **Handle validation errors gracefully** in production
4. **Test validation edge cases** thoroughly
5. **Consider validation performance** for large datasets

### Migration Strategy

1. **Plan migration paths** before making schema changes
2. **Group related changes** into single migration steps
3. **Test both up and down migrations** for correctness
4. **Consider migration dependencies** across packages
5. **Provide clear migration documentation** for major changes

## Performance Considerations

### Memory Optimization

- Immutable record structures prevent accidental mutations
- `devFreeze()` in development prevents mutation bugs
- Efficient ID generation with minimal allocations
- Style property sharing reduces memory overhead

### Validation Performance

- Lazy validation where possible
- `validateUsingKnownGoodVersion()` optimizations
- Minimal validation in hot paths
- Development vs production validation levels

### Schema Efficiency

- Fractional indexing for efficient reordering
- Minimal required properties to reduce validation overhead
- Efficient diff computation for large record sets
- Optimized serialization/deserialization

## Key Components Deep Dive

### Style Property System

**Style Property Lifecycle:**

1. Definition with unique ID and default value
2. Registration in shape props validation
3. Style tracking in editor state
4. Application to selected shapes
5. Persistence for next shape creation

**Style Property Types:**

- **Free-form:** `StyleProp.define()` with custom validation
- **Enum-based:** `StyleProp.defineEnum()` with predefined values
- **Theme integration:** Colors that adapt to light/dark themes

### Shape Property Patterns

**Geometric Properties:**

- Position: `x`, `y`, `rotation` (inherited from base)
- Size: `w`, `h` or shape-specific dimensions
- Transform: Handled by editor transformation system

**Visual Properties:**

- Color, dash, fill, size (style properties)
- Opacity (inherited from base)
- Shape-specific visual properties (e.g., `geo` for geometric shapes)

**Content Properties:**

- Text content (`richText` for formatted text)
- Asset references (`assetId` for media shapes)
- URLs and metadata for external content

### Record Scope System

**Scope Types:**

- **`document`** - Synced and persisted (shapes, assets, pages)
- **`session`** - Per-instance, may be persisted (user preferences)
- **`presence`** - Real-time only, not persisted (cursors, selections)

**Scope Implications:**

- Different sync and persistence behavior
- Scoped listeners for targeted reactivity
- Security and privacy considerations
- Performance optimization opportunities

## Integration Points

### Dependencies

- **`@tldraw/store`** - Record storage and reactivity
- **`@tldraw/validate`** - Runtime validation system
- **`@tldraw/utils`** - Utility functions and type helpers

### Extension Points

- **Custom shapes** via schema configuration
- **Custom bindings** for shape connections
- **Custom assets** for media handling
- **Custom migrations** for schema evolution
- **Custom style properties** for shared styling

### Framework Integration

- Framework-agnostic type definitions
- React integration via editor package
- Server-side rendering support
- Validation works in any JavaScript environment

## Common Development Scenarios

### Adding a New Shape

1. Define shape interface extending `TLBaseShape`
2. Create props validation object
3. Implement migration sequence
4. Add to default shape schemas
5. Test validation and migrations

### Modifying Existing Shape

1. Update shape interface
2. Add migration for property changes
3. Update validation schema
4. Test backward compatibility
5. Update shape util implementation

### Adding Style Property

1. Define style property with unique ID
2. Add to relevant shape props
3. Update shape validation
4. Consider theme integration
5. Test style persistence

### Schema Evolution

1. Identify breaking changes
2. Plan migration strategy
3. Implement migrations with tests
4. Update documentation
5. Coordinate with related packages

## Testing Patterns

### Migration Testing (`src/__tests__/`)

- Round-trip migration testing (up then down)
- Migration performance testing
- Edge case handling
- Data corruption prevention

### Validation Testing

- Valid and invalid input testing
- Type coercion behavior
- Performance under load
- Error message quality

### Integration Testing

- Store integration with real data
- Cross-package compatibility
- Asset handling workflows
- Real-time sync scenarios

## Common Pitfalls

1. **Migration Inconsistencies:** Mismatched up/down migrations causing data loss
2. **Validation Performance:** Over-complex validators in hot paths
3. **Style Property Conflicts:** Multiple properties with same ID
4. **ID Type Confusion:** Using wrong ID types for references
5. **Schema Breaking Changes:** Changes without proper migrations
6. **Asset Reference Issues:** Orphaned asset references after deletion
7. **Scope Misuse:** Wrong record scope affecting sync/persistence behavior

## Package Dependencies and Integration

**Internal Dependencies:**

- Builds on `@tldraw/store` for record management
- Uses `@tldraw/validate` for all validation
- Requires `@tldraw/utils` for utilities

**Consumer Packages:**

- `@tldraw/editor` uses schema for editor configuration
- `@tldraw/tldraw` provides default schemas
- Custom implementations extend base schemas

**External Integration:**

- Asset stores implement `TLAssetStore` interface
- Sync engines use record diffs and migrations
- Persistence layers handle schema versioning
