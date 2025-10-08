# @tldraw/tlschema

The schema package defines the type system, data structures, validation, and migrations for tldraw's persisted data. It provides a complete, type-safe, and version-aware data model that powers the tldraw editor.

## 1. Introduction

**@tldraw/tlschema** is the foundational package that defines how tldraw stores and manages data. It contains:

- **Record types** for all persisted data (shapes, assets, pages, user state)
- **Validation schemas** that ensure data integrity at runtime
- **Migration sequences** that handle data evolution over time
- **Style properties** that enable consistent styling across shapes

You'll use this package when creating custom shapes, defining your own data schemas, or when you need to work with tldraw's data structures directly.

## 2. Core Concepts

### Schemas: The Foundation

A **schema** defines the structure of your tldraw store. It specifies what types of records can exist, how they're validated, and how they evolve over time.

```ts
import { createTLSchema, defaultShapeSchemas } from '@tldraw/tlschema'

// Create a schema with default shapes
const schema = createTLSchema({
	shapes: defaultShapeSchemas,
})
```

### Records: The Data Units

**Records** are the individual pieces of data stored in tldraw. Every record has a type, an ID, and properties specific to that type:

```ts
import { TLShape, TLPage, TLAsset } from '@tldraw/tlschema'

// All records extend BaseRecord
const shape: TLShape = {
	id: 'shape:abc123',
	typeName: 'shape',
	type: 'geo',
	x: 100,
	y: 200,
	rotation: 0,
	// ... other properties
}
```

### Style Properties: Shared Styling

**Style properties** are special properties that can be applied across multiple shapes and persist for new shape creation:

```ts
import { StyleProp } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// Define a custom style property
const MyCustomStyle = StyleProp.define('myapp:custom', {
	defaultValue: 'default',
	type: T.string,
})
```

## 3. Basic Usage

### Creating a Custom Schema

You create schemas by combining shape configurations, bindings, and migrations:

```ts
import { createTLSchema, defaultShapeSchemas, defaultBindingSchemas } from '@tldraw/tlschema'

const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		// Add custom shapes here
	},
	bindings: defaultBindingSchemas,
})
```

### Working with Shape Records

Shape records are the most common type you'll work with. Every shape extends `TLBaseShape`:

```ts
import { TLBaseShape, createShapeValidator } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// Define a custom shape type
interface MyCustomShape extends TLBaseShape<'custom', MyCustomShapeProps> {}

interface MyCustomShapeProps {
	width: number
	height: number
	color: string
}

// Create validation for your shape
const customShapeValidator = createShapeValidator('custom', {
	width: T.number,
	height: T.number,
	color: T.string,
})
```

### Integrating with Store

Once you have a schema, you use it to create a store:

```ts
import { Store } from '@tldraw/store'
import { TLStoreProps } from '@tldraw/tlschema'

const store = new Store({
	schema,
	props: {
		defaultName: 'My Drawing',
		assets: myAssetStore, // Your asset storage implementation
	},
})
```

## 4. Advanced Topics

### Creating Custom Shapes

When creating custom shapes, follow this pattern for complete integration:

```ts
import {
	TLBaseShape,
	createShapeValidator,
	createShapePropsMigrationSequence,
	RecordProps,
} from '@tldraw/tlschema'
import { DefaultColorStyle } from '@tldraw/tlschema'

// 1. Define the shape interface
interface MyShape extends TLBaseShape<'myshape', MyShapeProps> {}

interface MyShapeProps {
	color: typeof DefaultColorStyle // Use existing style
	width: number
	height: number
	customData: string
}

// 2. Create props validation
const myShapeProps: RecordProps<MyShape> = {
	color: DefaultColorStyle,
	width: T.number,
	height: T.number,
	customData: T.string,
}

// 3. Define migrations for schema evolution
const myShapeMigrations = createShapePropsMigrationSequence({
	sequenceId: 'com.myapp.shape.myshape',
	sequence: [
		{
			id: 'com.myapp.shape.myshape/1.0.0',
			up: (props) => props, // Initial version
			down: (props) => props,
		},
	],
})

// 4. Add to schema
const schema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		myshape: {
			props: myShapeProps,
			migrations: myShapeMigrations,
		},
	},
})
```

### Custom Style Properties

Style properties enable consistent styling across shapes and remember the last used value:

```ts
import { StyleProp, EnumStyleProp } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'

// Free-form style property
const MyWidthStyle = StyleProp.define('myapp:width', {
	defaultValue: 2,
	type: T.number,
})

// Enum-based style property
const MyPatternStyle = StyleProp.defineEnum('myapp:pattern', {
	defaultValue: 'solid',
	values: ['solid', 'dashed', 'dotted'],
})

// Use in shape props
interface MyShapeProps {
	width: typeof MyWidthStyle
	pattern: typeof MyPatternStyle
	// other props...
}
```

### Asset Management

Assets represent external resources like images, videos, or bookmarks:

```ts
import { TLImageAsset, TLAssetStore } from '@tldraw/tlschema'

// Implement asset storage
const assetStore: TLAssetStore = {
	async upload(asset, file) {
		// Upload file to your storage service
		const src = await uploadToStorage(file)
		return { src }
	},

	async resolve(asset, context) {
		// Resolve asset URL for rendering
		return asset.props.src
	},

	async remove(assetIds) {
		// Clean up removed assets
		await deleteFromStorage(assetIds)
	},
}
```

### Migration Strategies

Migrations handle schema evolution as your application develops:

```ts
import { createShapePropsMigrationSequence } from '@tldraw/tlschema'

const migrations = createShapePropsMigrationSequence({
	sequenceId: 'com.myapp.shape.custom',
	sequence: [
		{
			id: 'com.myapp.shape.custom/1.1.0',
			up: (props) => {
				// Add new property with default value
				return { ...props, newProperty: 'default' }
			},
			down: ({ newProperty, ...props }) => {
				// Remove property for backward compatibility
				return props
			},
		},
		{
			id: 'com.myapp.shape.custom/1.2.0',
			up: (props) => {
				// Rename property
				return {
					...props,
					renamedProperty: props.oldProperty,
					oldProperty: undefined,
				}
			},
			down: (props) => {
				return {
					...props,
					oldProperty: props.renamedProperty,
					renamedProperty: undefined,
				}
			},
		},
	],
})
```

## 5. Built-in Shape Types

### Default Shapes

tldraw includes several built-in shape types:

```ts
import {
	TLGeoShape, // Rectangles, ellipses, triangles, etc.
	TLTextShape, // Text with rich formatting
	TLDrawShape, // Freehand drawing paths
	TLArrowShape, // Arrows with optional binding to shapes
	TLLineShape, // Multi-point lines and splines
	TLImageShape, // Raster images
	TLVideoShape, // Video files
	TLNoteShape, // Sticky notes
	TLBookmarkShape, // Website bookmarks
	TLEmbedShape, // Embedded content (YouTube, Figma, etc.)
	TLFrameShape, // Frames for grouping content
	TLGroupShape, // Groups for organizing shapes
	TLHighlightShape, // Highlighting tool strokes
} from '@tldraw/tlschema'
```

### Shape Properties

All shapes share common base properties from `TLBaseShape`:

```ts
interface TLBaseShape<Type, Props> {
	id: TLShapeId
	type: Type
	x: number // Position X
	y: number // Position Y
	rotation: number // Rotation in radians
	index: IndexKey // Fractional index for ordering
	parentId: TLParentId // Parent page or shape
	isLocked: boolean // Whether shape can be selected
	opacity: TLOpacityType // Transparency (0-1)
	props: Props // Shape-specific properties
	meta: JsonObject // User-defined metadata
}
```

### Geo Shapes

Geometric shapes support various styles and configurations:

```ts
import { TLGeoShape, GeoShapeGeoStyle } from '@tldraw/tlschema'

// Geo shapes can be rectangles, ellipses, triangles, etc.
const geoShape: TLGeoShape = {
	// ... base properties
	props: {
		geo: GeoShapeGeoStyle, // 'rectangle', 'ellipse', 'triangle', etc.
		w: 100, // Width
		h: 80, // Height
		color: 'blue', // Color style
		fill: 'solid', // Fill style
		dash: 'solid', // Dash style
		size: 'm', // Size style
		richText: null, // Optional text content
	},
}
```

## 6. Validation and Type Safety

### Runtime Validation

All records are validated at runtime to ensure data integrity:

```ts
import { T } from '@tldraw/validate'
import { createShapeValidator } from '@tldraw/tlschema'

// Validation happens automatically when records enter the store
const validator = createShapeValidator('myshape', {
	width: T.number.check((n) => n > 0), // Custom validation
	height: T.number.check((n) => n > 0),
	color: T.string,
})
```

### Error Handling

When validation fails, you can handle errors gracefully:

```ts
try {
	store.put([invalidRecord])
} catch (error) {
	if (error instanceof ValidationError) {
		console.log('Validation failed:', error.message)
		// Handle validation error appropriately
	}
}
```

### Type-Safe IDs

Record IDs are strongly typed to prevent mixing different record types:

```ts
import { TLShapeId, TLPageId, createShapeId } from '@tldraw/tlschema'

// IDs are branded types - compiler prevents mixing them up
const shapeId: TLShapeId = createShapeId()
const pageId: TLPageId = 'page:123' // TypeScript error if you use wrong format
```

## 7. Integration with @tldraw/store

### Store Configuration

The schema integrates with the store system to provide reactive data management:

```ts
import { Store } from '@tldraw/store'
import { TLStoreProps, createTLSchema } from '@tldraw/tlschema'

const schema = createTLSchema()
const store = new Store({
	schema,
	props: {
		defaultName: 'Untitled',
		assets: assetStore,
		onMount: (editor) => {
			// Initialize when editor mounts
			console.log('Editor mounted with store')
		},
	},
})
```

### Reactive Queries

The store provides reactive access to records:

```ts
import { track } from '@tldraw/state'

// This function will re-run when shapes change
const ShapeCounter = track(() => {
	const shapes = store.query.records('shape').get()
	return `Total shapes: ${shapes.length}`
})
```

## 8. Performance Considerations

### Validation Optimization

- Use `validateUsingKnownGoodVersion()` when you know data is already valid
- Minimize validation in hot paths during user interactions
- Consider validation levels (development vs production)

### Memory Management

- Style properties are shared across shapes to reduce memory usage
- Records use immutable structures to prevent accidental mutations
- `devFreeze()` helps catch mutation bugs in development

### Migration Performance

- Group related changes into single migration steps
- Test migration performance with realistic data sizes
- Use migration sequence IDs to optimize dependency resolution

## 9. Debugging

### Understanding Schema Structure

You can inspect your schema to understand its configuration:

```ts
const schema = createTLSchema()

// Examine record types
console.log('Record types:', Object.keys(schema.types))

// Check validation for specific record type
const shapeValidator = schema.types.shape
console.log('Shape validator:', shapeValidator)
```

### Migration Debugging

When migrations fail, examine the migration sequence:

```ts
// Check migration history
const migrations = schema.sortedMigrations
console.log(
	'Migration sequence:',
	migrations.map((m) => m.id)
)

// Test individual migrations
try {
	const migrated = migrator.migrateStoreSnapshot({
		schema: oldSchema,
		store: snapshot,
	})
	console.log('Migration successful')
} catch (error) {
	console.error('Migration failed:', error)
}
```

### Validation Errors

When records fail validation, examine the validation path:

```ts
import { T } from '@tldraw/validate'

try {
	shapeValidator.validate(invalidShape)
} catch (error) {
	console.log('Validation path:', error.path)
	console.log('Validation message:', error.message)
	console.log('Invalid value:', error.value)
}
```

## 10. Common Patterns

### Shape with Asset References

Many shapes reference assets for their content:

```ts
interface MediaShapeProps {
	assetId: TLAssetId | null
	width: number
	height: number
	crop?: TLShapeCrop // Optional cropping info
}

// Usage pattern
const imageShape: TLImageShape = {
	// ... base properties
	props: {
		assetId: 'asset:image123',
		w: 200,
		h: 150,
		crop: {
			topLeft: { x: 0, y: 0 },
			bottomRight: { x: 1, y: 1 },
		},
	},
}
```

### Binding Relationships

Arrows can bind to other shapes:

```ts
import { TLArrowBinding } from '@tldraw/tlschema'

const arrowBinding: TLArrowBinding = {
	id: 'binding:abc123',
	typeName: 'binding',
	type: 'arrow',
	fromId: 'shape:arrow1', // Arrow shape ID
	toId: 'shape:rectangle1', // Target shape ID
	props: {
		terminal: 'end', // 'start' or 'end'
		normalizedAnchor: { x: 0.5, y: 0.5 }, // Position on target
		isExact: false, // Whether position is exact
		isPrecise: true, // Whether binding is precise
	},
}
```

### Rich Text Content

Shapes can contain formatted text:

```ts
import { TLRichText, toRichText } from '@tldraw/tlschema'

const richText: TLRichText = toRichText('Hello **bold** text')

const textShape: TLTextShape = {
	// ... base properties
	props: {
		color: 'black',
		size: 'm',
		font: 'draw',
		textAlign: 'start',
		richText: richText,
		autoSize: true,
		scale: 1,
	},
}
```

## 11. Best Practices

### Schema Design

- **Start simple** - Begin with minimal shape properties and add complexity gradually
- **Use existing styles** - Leverage built-in style properties before creating custom ones
- **Plan for evolution** - Design your schema with migrations in mind
- **Validate thoroughly** - Include validation for edge cases and invalid states

### Migration Strategy

- **Version incrementally** - Use semantic versioning in migration IDs
- **Test both directions** - Ensure up and down migrations work correctly
- **Handle failures gracefully** - Provide fallbacks when migrations fail
- **Document breaking changes** - Clearly communicate migration requirements

### Performance Optimization

- **Minimize validation overhead** - Use efficient validators for frequently accessed properties
- **Batch related changes** - Group property updates to reduce reactive updates
- **Use appropriate record scopes** - Choose correct scope (document/session/presence) for data
- **Optimize asset handling** - Implement efficient asset storage and resolution

### Error Handling

- **Validate early** - Catch validation errors as close to the source as possible
- **Provide clear messages** - Use descriptive error messages for debugging
- **Handle partial failures** - Design systems that can recover from individual record failures
- **Log strategically** - Include enough context for debugging without overwhelming logs

## 12. Extension Points

### Custom Shapes

Extend the built-in shape system:

```ts
// Add custom shapes to default schemas
const customSchema = createTLSchema({
	shapes: {
		...defaultShapeSchemas,
		myCustomShape: customShapeConfig,
	},
})
```

### Custom Bindings

Create new types of shape relationships:

```ts
// Define custom binding types
interface MyCustomBinding extends TLBaseBinding<'custom', MyBindingProps> {}

const customBindingConfig = {
	props: myBindingProps,
	migrations: myBindingMigrations,
}
```

### Asset Storage

Implement custom asset storage backends:

```ts
const customAssetStore: TLAssetStore = {
	async upload(asset, file) {
		return await myCloudStorage.upload(file)
	},
	async resolve(asset, context) {
		return await myCloudStorage.getUrl(asset.props.src, context)
	},
	async remove(assetIds) {
		await Promise.all(assetIds.map((id) => myCloudStorage.delete(id)))
	},
}
```

The tlschema package provides a robust foundation for building applications with tldraw. By following these patterns and understanding the core concepts, you can create custom shapes, manage data effectively, and build experiences that scale with your users' needs.
