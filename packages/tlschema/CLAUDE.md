# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the tlschema package in this repository.

## Package Overview

The `@tldraw/tlschema` package is the foundational schema and type system for tldraw. It defines all data structures, validation rules, and migration logic for shapes, records, assets, and the store itself. This is the single source of truth for tldraw's data model.

## Key Architecture Patterns

### Record Types and Schema Creation

The package follows a hierarchical structure where `createTLSchema()` in `src/createTLSchema.ts` orchestrates the entire schema:

- **Shape Schema**: Defined in `defaultShapeSchemas` - each shape type has migrations and props
- **Binding Schema**: Defined in `defaultBindingSchemas` - for relationships between shapes
- **Record Types**: Core records like `TLCamera`, `TLPage`, `TLInstance`, etc. in `src/records/`

### Shape Definition Pattern

Every shape follows this consistent structure:
```typescript
// In src/shapes/TLXxxShape.ts
export const xxxShapeProps = {
  // Props using StyleProp for shared styles or T.validators for shape-specific props
}

export const xxxShapeMigrations = createShapePropsMigrationSequence([
  // Migration definitions with up/down functions
])

export type TLXxxShape = TLBaseShape<'xxx', TLXxxShapeProps>
```

### StyleProp System

`src/styles/StyleProp.ts` defines the shared style system:
- **StyleProp.define()**: For custom style properties
- **StyleProp.defineEnum()**: For predefined value sets (like `DefaultColorStyle`)
- **StyleProp.defineEnumOrString()**: For extensible enums that allow custom values

Style props enable:
1. Multi-shape selection and editing
2. Persistent default values for new shapes
3. Consistent styling across shape types

### Migration System

Two types of migrations are used:

1. **Store-level migrations** (`src/store-migrations.ts`): Handle structural store changes
2. **Record-level migrations**: Handle changes to specific record types
   - Shape migrations in `src/records/TLShape.ts` (rootShapeMigrations)
   - Individual shape prop migrations in each shape file

Migration pattern:
```typescript
export const xxxVersions = createMigrationIds('com.tldraw.xxx', {
  SomeMigration: 1,
  AnotherMigration: 2,
})

export const xxxMigrations = createRecordMigrationSequence({
  sequenceId: 'com.tldraw.xxx',
  recordType: 'xxx',
  sequence: [
    {
      id: xxxVersions.SomeMigration,
      up: (record) => { /* transform forward */ },
      down: (record) => { /* transform backward */ },
    }
  ]
})
```

## Directory Structure Guide

- **`src/records/`**: Core record types (TLShape, TLPage, TLCamera, etc.)
- **`src/shapes/`**: All shape definitions with their props and migrations
- **`src/styles/`**: Style system and default style props
- **`src/assets/`**: Asset record types (image, video, bookmark)
- **`src/bindings/`**: Binding system for shape relationships
- **`src/misc/`**: Utility types, validators, and helper structures
- **`src/translations/`**: Localization support

## Key Files to Understand

- **`src/createTLSchema.ts`**: Schema factory - start here to understand how everything connects
- **`src/records/TLShape.ts`**: Shape system foundation and root migrations
- **`src/styles/StyleProp.ts`**: Style system implementation
- **`src/TLStore.ts`**: Store type definitions and context
- **`src/recordsWithProps.ts`**: Props migration processing utilities

## Common Development Patterns

### Adding a New Shape

1. Create `src/shapes/TLMyShape.ts` following the pattern
2. Define props using StyleProp or validators
3. Add migrations if needed
4. Export from main index
5. Add to `defaultShapeSchemas` in createTLSchema
6. Test with migration tests

### Adding a New Style Property

1. Define in appropriate style file in `src/styles/`
2. Use `StyleProp.defineEnum()` or `StyleProp.define()`
3. Add to shape props that should use it
4. Consider migration needs for existing shapes

### Working with Migrations

- Always test both up and down migrations
- Use `src/__tests__/migrationTestUtils.ts` for testing
- Migration IDs must be unique across the entire schema
- Consider backward compatibility carefully

## Validation and Type Safety

The package uses `@tldraw/validate` extensively:
- All record types have validators
- Props use T.validators for runtime type checking
- StyleProps have built-in validation
- Custom validators in `src/misc/id-validator.ts` and similar files

## Testing Guidelines

- Migration tests in `src/migrations.test.ts`
- Individual shape/record tests colocated with source files
- Use `migrationTestUtils.ts` for testing migration sequences
- Rich text parsing tests in `src/misc/TLRichText.test.ts`

## Dependencies and Relationships

- **`@tldraw/store`**: Provides the underlying record/store system
- **`@tldraw/validate`**: Runtime type validation
- **`@tldraw/utils`**: Utility functions
- **`@tldraw/state`**: Reactive state management (imported by dependent packages)

This package is imported by `@tldraw/editor` and `@tldraw/tldraw`, making it the foundational layer of the entire tldraw stack.