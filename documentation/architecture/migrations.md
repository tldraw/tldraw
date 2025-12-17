---
title: Migrations
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - migrations
  - schema
  - versioning
  - upgrades
  - compatibility
---

The migration system ensures tldraw documents remain compatible across versions. When schemas change, migrations transform old data to new formats automatically and transparently.

## Overview

tldraw's migration system handles:

- **Record migrations**: Transform individual records when their schema changes
- **Store migrations**: Transform the entire store structure
- **Sequence migrations**: Multi-step migrations for complex changes
- **Down migrations**: Optionally reverse migrations for older clients

## Migration concepts

### Schema versioning

Every record type has a version number:

```typescript
const ShapeRecordType = createRecordType<TLShape>('shape', {
  validator: shapeValidator,
  scope: 'document',
}).withDefaultProperties(() => ({
  ...defaultProps,
}))

// Version tracked in schema
schemaVersion: 2
```

### Migration direction

Migrations can run in either direction:

- **Up**: Old format → New format (most common)
- **Down**: New format → Old format (for older clients)

## Creating migrations

### Record type migrations

```typescript
import { createMigrationIds, createRecordMigrationSequence } from '@tldraw/store'

// Define migration IDs
const versions = createMigrationIds('com.myapp/task', {
  AddPriority: 1,
  RenameField: 2,
})

// Create migration sequence
const taskMigrations = createRecordMigrationSequence({
  sequenceId: 'com.myapp/task',
  recordType: 'task',
  sequence: [
    {
      id: versions.AddPriority,
      up: (record) => {
        return {
          ...record,
          priority: 'medium',  // Add new field with default
        }
      },
      down: (record) => {
        const { priority, ...rest } = record
        return rest  // Remove the field
      }
    },
    {
      id: versions.RenameField,
      up: (record) => {
        const { oldName, ...rest } = record
        return { ...rest, newName: oldName }
      },
      down: (record) => {
        const { newName, ...rest } = record
        return { ...rest, oldName: newName }
      }
    }
  ]
})
```

### Store migrations

For changes that affect the entire store:

```typescript
const storeMigrations = createStoreMigrationSequence({
  sequenceId: 'com.myapp/store',
  sequence: [
    {
      id: 'remove-deprecated-records',
      up: (store) => {
        // Remove all records of deprecated type
        for (const record of Object.values(store)) {
          if (record.typeName === 'deprecated') {
            delete store[record.id]
          }
        }
      }
    },
    {
      id: 'consolidate-settings',
      up: (store) => {
        // Combine multiple settings records into one
        const settings = Object.values(store)
          .filter(r => r.typeName === 'setting')

        if (settings.length > 0) {
          const consolidated = mergeSettings(settings)
          // Remove old records
          settings.forEach(s => delete store[s.id])
          // Add consolidated record
          store[consolidated.id] = consolidated
        }
      }
    }
  ]
})
```

## Migration sequences

### Defining version IDs

```typescript
// Use a namespace for your app
const myVersions = createMigrationIds('com.mycompany/myapp', {
  InitialRelease: 1,
  AddUserProfiles: 2,
  SplitNames: 3,
  AddTimestamps: 4,
})
```

### Sequence order

Migrations always run in sequence order:

```typescript
// Data at version 1 migrating to version 4:
// 1 → 2 (AddUserProfiles)
// 2 → 3 (SplitNames)
// 3 → 4 (AddTimestamps)
```

### Partial migrations

For specific version jumps:

```typescript
// From version 2 to version 4:
// 2 → 3 (SplitNames)
// 3 → 4 (AddTimestamps)
```

## Built-in tldraw migrations

### Shape migrations

```typescript
// Example: Arrow shape migration
{
  id: arrowVersions.AddLabelColor,
  up: (shape) => ({
    ...shape,
    props: {
      ...shape.props,
      labelColor: 'black',  // New default
    }
  }),
  down: (shape) => {
    const { labelColor, ...props } = shape.props
    return { ...shape, props }
  }
}
```

### Document migrations

```typescript
// Example: Document name field added
{
  id: documentVersions.AddName,
  up: (document) => ({
    ...document,
    name: '',  // Empty string default
  }),
  down: (document) => {
    const { name, ...rest } = document
    return rest
  }
}
```

## Running migrations

### On store load

```typescript
import { createTLStore, defaultShapeUtils } from '@tldraw/tldraw'

const store = createTLStore({
  shapeUtils: defaultShapeUtils,
})

// Load snapshot - migrations run automatically
const snapshot = loadFromStorage()
store.loadSnapshot(snapshot)
// ^ Data is migrated to current schema version
```

### Manual migration

```typescript
import { migrate } from '@tldraw/store'

const oldSnapshot = { /* version 1 data */ }

const migrated = migrate({
  snapshot: oldSnapshot,
  migrations: myMigrations,
  fromVersion: 1,
  toVersion: 4,
})
```

## Migration strategies

### Additive changes

Safest approach - add new fields with defaults:

```typescript
{
  id: versions.AddCreatedAt,
  up: (record) => ({
    ...record,
    createdAt: Date.now(),  // Default for existing records
  }),
  down: (record) => {
    const { createdAt, ...rest } = record
    return rest
  }
}
```

### Renaming fields

```typescript
{
  id: versions.RenameColorToFill,
  up: (record) => {
    const { color, ...rest } = record.props
    return {
      ...record,
      props: { ...rest, fill: color }
    }
  },
  down: (record) => {
    const { fill, ...rest } = record.props
    return {
      ...record,
      props: { ...rest, color: fill }
    }
  }
}
```

### Restructuring data

```typescript
{
  id: versions.SplitAddress,
  up: (record) => {
    const { address, ...rest } = record
    const [street, city, zip] = parseAddress(address)
    return {
      ...rest,
      street,
      city,
      zip,
    }
  },
  down: (record) => {
    const { street, city, zip, ...rest } = record
    return {
      ...rest,
      address: `${street}, ${city} ${zip}`,
    }
  }
}
```

### Type changes

```typescript
{
  id: versions.StringToEnum,
  up: (record) => ({
    ...record,
    status: normalizeStatus(record.status),  // 'in progress' → 'in_progress'
  }),
  down: (record) => ({
    ...record,
    status: denormalizeStatus(record.status),  // 'in_progress' → 'in progress'
  })
}
```

## Validation during migration

```typescript
{
  id: versions.AddValidatedField,
  up: (record) => {
    const migrated = {
      ...record,
      email: record.email || '',
    }

    // Validate after migration
    if (!isValidEmail(migrated.email)) {
      migrated.email = ''  // Fallback to safe default
    }

    return migrated
  }
}
```

## Testing migrations

```typescript
describe('Task migrations', () => {
  test('AddPriority migration', () => {
    const v1Record = { id: 'task:1', title: 'Test' }

    const v2Record = taskMigrations.migrators[versions.AddPriority].up(v1Record)

    expect(v2Record.priority).toBe('medium')
  })

  test('Round-trip migration', () => {
    const original = { id: 'task:1', title: 'Test', priority: 'high' }

    const migrator = taskMigrations.migrators[versions.AddPriority]
    const down = migrator.down(original)
    const up = migrator.up(down)

    expect(up.priority).toBe('medium')  // Lost 'high', got default
  })

  test('Full sequence migration', () => {
    const v1Snapshot = { /* old data */ }

    const current = migrate({
      snapshot: v1Snapshot,
      migrations: taskMigrations,
      fromVersion: 1,
      toVersion: taskMigrations.currentVersion,
    })

    expect(current).toMatchSnapshot()
  })
})
```

## Best practices

### Do

- Write both up and down migrations when possible
- Test migrations thoroughly with real data
- Use semantic version IDs that describe the change
- Keep migrations simple and focused
- Add defaults for new required fields

### Avoid

- Complex logic in migrations (keep it simple)
- External dependencies (migrations should be self-contained)
- Data loss without down migration path
- Breaking changes without migration

### Handling edge cases

```typescript
{
  id: versions.HandleNulls,
  up: (record) => ({
    ...record,
    // Handle potential null/undefined gracefully
    items: Array.isArray(record.items) ? record.items : [],
    settings: record.settings ?? {},
  })
}
```

## Key files

- packages/store/src/lib/migrate.ts - Migration runner
- packages/store/src/lib/StoreSchema.ts - Schema with migrations
- packages/tlschema/src/migrations.ts - tldraw migrations
- packages/tlschema/src/versions.ts - Version constants

## Related

- [@tldraw/store](../packages/store.md) - Store package
- [@tldraw/tlschema](../packages/tlschema.md) - Schema definitions
- [Store and records](./store-records.md) - Store architecture
