# CONTEXT.md - @tldraw/tlschema

Type definitions, schema migrations, and validation for all persisted data structures in the tldraw ecosystem, including shapes, records, assets, and bindings.

## Package Overview

- **Purpose**: Defines the complete data schema for tldraw with type safety, validation, and migration support
- **Type**: Schema/Type Definition Library  
- **Status**: Production
- **Dependencies**: `@tldraw/state`, `@tldraw/store`, `@tldraw/utils`, `@tldraw/validate`
- **Consumers**: All tldraw packages that handle persisted data (editor, store, sync, dotcom, etc.)

## Architecture

### Core Components

- **Record Types**: Root data types (TLShape, TLAsset, TLPage, TLDocument, etc.)
- **Shape Types**: Specialized shape definitions (Arrow, Text, Geo, Draw, etc.)
- **Asset Types**: Media asset definitions (Image, Video, Bookmark)
- **Binding Types**: Relationship definitions between shapes (Arrow bindings)
- **Migration System**: Version-aware data migration for schema evolution
- **Validation System**: Runtime type validation using @tldraw/validate

### Key Files

- `src/index.ts` - Main exports and schema aggregation
- `src/createTLSchema.ts` - Schema factory with shape/binding registration
- `src/TLStore.ts` - Store type definitions and helper functions
- `src/records/` - Core record type definitions (TLShape, TLAsset, TLPage, etc.)
- `src/shapes/` - Shape-specific type definitions and migrations
- `src/assets/` - Asset type definitions (Image, Video, Bookmark)
- `src/bindings/` - Binding definitions for shape relationships
- `src/styles/` - Reusable style property definitions
- `src/store-migrations.ts` - Store-level migration logic
- `src/translations/` - Internationalization support

## API/Interface

### Public API

```ts
import { createTLSchema, TLStore, TLShape } from '@tldraw/tlschema'

// Create schema with custom shapes
const schema = createTLSchema({
  shapes: {
    // Built-in shapes are included by default
    custom: {
      type: 'custom',
      props: { /* custom props */ },
      migrations: { /* migration logic */ }
    }
  }
})

// Type-safe shape definitions
const textShape: TLTextShape = {
  id: 'shape:123',
  type: 'text',
  typeName: 'shape',
  x: 0, y: 0,
  props: {
    text: 'Hello',
    size: 'm',
    color: 'black'
  }
  // ... other required fields
}

// Store with validation
type Store = TLStore<typeof schema>
```

Main exports:
- `createTLSchema(options)` - Schema factory
- Record types: `TLShape`, `TLAsset`, `TLPage`, `TLDocument`
- Shape types: `TLTextShape`, `TLArrowShape`, `TLGeoShape`
- Asset types: `TLImageAsset`, `TLVideoAsset`
- Store types: `TLStore`, `TLStoreSnapshot`

### Schema Structure

**Records (Root Types)**:
- `TLDocument` - Document metadata
- `TLPage` - Page definitions
- `TLShape` - Base shape type with subtypes
- `TLAsset` - Media assets with subtypes
- `TLBinding` - Shape relationships
- `TLCamera` - Viewport camera state
- `TLInstance` - Editor instance state

**Shape Subtypes**:
- Text, Arrow, Geo, Draw, Line, Highlight
- Frame, Group, Embed, Image, Video, Note, Bookmark

**Asset Subtypes**:
- Image, Video, Bookmark (with metadata)

## Development

### Setup

```bash
cd packages/tlschema
yarn install
```

### Commands

- `yarn test` - Run Jest tests including migration tests
- `yarn build` - Build package with type definitions
- `yarn index` - Rebuild index.ts exports automatically
- `yarn format` - Format code with prettier
- `yarn lint` - Lint code

### Schema Evolution

When modifying persisted data structures:

1. **Add version constant** in relevant file:
```ts
const Versions = {
  Initial: 1,
  AddNewProperty: 2, // New version
} as const
```

2. **Update type definition**:
```ts
interface MyShape {
  // existing props
  newProperty: string // Add new property
}
```

3. **Add migration**:
```ts
export const myShapeMigrations = defineMigrations({
  currentVersion: Versions.AddNewProperty,
  migrators: {
    [Versions.AddNewProperty]: {
      up: (shape) => ({ ...shape, newProperty: 'default' }),
      down: ({ newProperty, ...shape }) => shape,
    }
  }
})
```

4. **Add tests** in `migrations.test.ts`

### Testing

- Comprehensive migration tests ensure backward compatibility
- Property validation tests for all shapes/records
- Schema integrity tests
- Test file: `src/migrations.test.ts`

## Integration Points

### Depends On

- `@tldraw/store` - Store system and migration framework
- `@tldraw/validate` - Runtime validation
- `@tldraw/state` - Reactive signals for derived data
- `@tldraw/utils` - Utility functions

### Used By

- `@tldraw/editor` - Editor consumes all shape and record types
- `@tldraw/tldraw` - UI components use schema for rendering
- `@tldraw/sync-core` - Sync system validates against schema
- `apps/dotcom` - Main app persists data using this schema
- All examples and integrations use schema types

## Common Issues & Solutions

### Migration Errors
- **Issue**: "Migration failed" during data loading
- **Solution**: Ensure all migrations are properly tested and handle edge cases

### Type Validation Failures  
- **Issue**: Runtime validation errors for shape properties
- **Solution**: Check that all required properties match the schema definition

### Missing Shape Types
- **Issue**: Custom shapes not recognized
- **Solution**: Register shapes using `createTLSchema()` with custom shape definitions

### Breaking Schema Changes
- **Issue**: Data incompatibility after schema updates
- **Solution**: Always add migrations for breaking changes, never modify existing versions

## Future Considerations

- Enhanced validation performance for large documents
- Schema versioning for external integrations
- Plugin system for third-party shape types
- Improved migration tooling and testing
- Performance optimizations for complex shape hierarchies
- Better TypeScript inference for custom schemas