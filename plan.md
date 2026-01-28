# Plan: Update Zero to latest version

## Phased approach

**Phase 1 (this PR):** Update Zero 0.19 → 0.25, fix breaking changes, keep existing SST/Fly.io deployment
**Phase 2 (future PR):** Migrate prod/staging from SST to Fly.io

## Current state

- Zero version: `0.19.2025050203` in 3 packages:
  - `apps/dotcom/zero-cache/package.json`
  - `apps/dotcom/client/package.json`
  - `packages/dotcom-shared/package.json`
- Latest Zero: `0.25.7` (6 minor versions behind)

## Key files to modify

### 1. Package updates

- `apps/dotcom/zero-cache/package.json` - Zero server dependency
- `apps/dotcom/client/package.json` - Zero client dependency
- `packages/dotcom-shared/package.json` - Zero schema/mutators dependency

### 2. Breaking changes by version

**0.23: CustomMutatorDefs change**

- `CustomMutatorDefs<TlaSchema>` → `CustomMutatorDefs` (no template param)
- Affects: `packages/dotcom-shared/src/mutators.ts:1000`

**0.24: Renames**

- `server` → `cacheURL` in Zero constructor
- `ZERO_PUSH_URL` → `ZERO_MUTATE_URL` env var
- Query execution requires `.run()` when awaiting
- `ZERO_ADMIN_PASSWORD` env var required in production

**0.25: Auth and error handling**

- `auth` must be string, not function (currently using function)
- `onError` removed - use Connection Status API
- Mutator promises no longer reject - return structured results

### 3. Files with deep imports (WILL break)

| File                                                 | Deep Import                                     |
| ---------------------------------------------------- | ----------------------------------------------- |
| `packages/dotcom-shared/src/mutators.ts`             | `Transaction` from `/out/zql/src/mutate/custom` |
| `apps/dotcom/sync-worker/src/worker.ts`              | `ZQLDatabase` from `/out/zero/src/pg`           |
| `apps/dotcom/sync-worker/src/TLUserDurableObject.ts` | `SchemaCRUD`, `SchemaQuery`                     |
| `apps/dotcom/sync-worker/src/postgres.ts`            | `PostgresJSConnection`, `PostgresJSTransaction` |
| `apps/dotcom/sync-worker/src/zero/ServerCrud.ts`     | `TableCRUD`                                     |
| `apps/dotcom/client/src/tla/app/ClientCRUD.ts`       | `TableCRUD`                                     |
| `apps/dotcom/client/src/tla/app/zero-polyfill.ts`    | Multiple deep imports                           |

### 4. TldrawApp.ts constructor changes needed

**Current:**

```ts
new Zero({
  auth: getToken,        // function - BREAKS in 0.25
  server: ZERO_SERVER,   // renamed in 0.24
  ...
})
```

**Required for 0.25:**

```ts
new Zero({
  auth: await getToken(),  // must be string
  cacheURL: ZERO_SERVER,   // renamed
  ...
})
```

### 5. Deployment configs

- `apps/dotcom/zero-cache/flyio.template.toml` - Uses `rocicorp/zero:VERSION` Docker image
- Version auto-pulled from package.json by deploy script
- New env vars needed: `ZERO_MUTATE_URL` (renamed), `ZERO_ADMIN_PASSWORD`

## Implementation steps

### Step 1: Update Zero packages

```bash
yarn workspace @tldraw/zero-cache add @rocicorp/zero@latest
yarn workspace dotcom add @rocicorp/zero@latest
yarn workspace @tldraw/dotcom-shared add @rocicorp/zero@latest
```

### Step 2: Fix deep imports

Find public exports for these types or use compatibility mode:

- `Transaction` → check `@rocicorp/zero` main export
- `TableCRUD`, `SchemaCRUD`, `SchemaQuery` → check `@rocicorp/zero/server`
- `PostgresJSConnection` → check `@rocicorp/zero/pg`
- `ZQLDatabase` → check `@rocicorp/zero/pg`

If not publicly exported, enable legacy mode temporarily:

```ts
const schema = createSchema({
  tables: [...],
  relationships: [...],
  enableLegacyMutators: true,  // temp compatibility
})
```

### Step 3: Fix API changes

1. `mutators.ts:1000`: Remove template param from `CustomMutatorDefs`
2. `TldrawApp.ts`:
   - Rename `server` → `cacheURL`
   - Change `auth: getToken` → `auth: await getToken()` + token refresh logic
3. Add `.run()` to any direct query awaits in mutators

### Step 4: Update env vars

- `flyio.template.toml`: Rename `ZERO_PUSH_URL` → `ZERO_MUTATE_URL`
- Add `ZERO_ADMIN_PASSWORD` for production (GitHub secrets)
- Update `deploy-dotcom.ts` if it references old env var names

### Step 5: Typecheck and lint

```bash
yarn typecheck
yarn lint
```

### Step 6: Test locally

```bash
cd apps/dotcom/zero-cache && yarn dev
```

### Step 7: Test deployment

- Create PR with `dotcom-preview-please` + `preview-flyio-zero-deploy-please`
- Verify Zero server starts with new Docker image
- Test with real Zero client: `localStorage.setItem('useProperZero', 'true')`

## Verification

1. `yarn typecheck` passes
2. `yarn lint` passes
3. Local dev server starts: `cd apps/dotcom/zero-cache && yarn dev`
4. Fly.io deployment succeeds with new version
5. App works with real Zero client (`localStorage.setItem('useProperZero', 'true')`)

## Changes made (Zero 0.25 migration)

### Query API deprecation (`tx.query` → `tx.run(zql)`)

Zero 0.25 deprecated the `tx.query` and `z.query` APIs in favor of a new pattern using `createBuilder`:

**Old pattern (deprecated):**

```ts
// Server-side mutators
const user = await tx.query!.user.where('id', '=', userId).one().run()
const files = await tx.query!.file.run()

// Client-side views
const userView = z.query.user.where('id', '=', userId).one().materialize()
```

**New pattern (Zero 0.25+):**

```ts
import { createBuilder } from '@rocicorp/zero'
const zql = createBuilder(schema)

// Server-side mutators
const user = await tx.run(zql.user.where('id', '=', userId).one())
const files = await tx.run(zql.file)

// Client-side views
const userView = z.materialize(zql.user.where('id', '=', userId).one())
```

**Why the change?**

- Separates query definition from execution
- Query builders are now stateless and reusable
- `createBuilder(schema)` creates typed query builders for all tables
- `tx.run()` and `z.run()`/`z.materialize()` execute queries against data

### Files updated

**`packages/dotcom-shared/src/mutators.ts`:**

- Added `import { createBuilder } from '@rocicorp/zero'`
- Added `import { schema } from './tlaSchema'`
- Created module-level query builder: `const zql = createBuilder(schema)`
- Replaced all 26 occurrences of `tx.query!.table.where(...).run()` with `tx.run(zql.table.where(...))`
- Removed file-level `eslint-disable @typescript-eslint/no-deprecated` comment

**`apps/dotcom/client/src/tla/app/zero-polyfill.ts`:**

- Added `import { createBuilder } from '@rocicorp/zero'`
- Added `run` method to transaction context passed to mutators
- Added `materialize(query)`, `preload(query)`, `run(query)` methods to Zero class
- Added `queryFromAst(query)` helper to convert Zero Query AST to ClientQuery
- Added `extractWhereConditions(where)` helper to parse AST conditions

The polyfill now supports both APIs:

- Legacy: `z.query.table.where(...).materialize()`
- New: `z.materialize(zql.table.where(...))`

**`apps/dotcom/client/src/tla/app/TldrawApp.ts`:**

- Added `import { createBuilder } from '@rocicorp/zero'`
- Created module-level query builder: `const zql = createBuilder(zeroSchema)`
- Updated `userQuery()`, `fileStateQuery()`, `groupMembershipsQuery()` to use `zql.*` instead of `this.z.query.*`
- Updated `signalizeQuery()` to use `this.z.materialize(query)` instead of `query.materialize()`
- Updated `preload()` to use `this.z.preload(query)` instead of `query.preload()`
- Using `(this.z as any)` cast to work around union type incompatibility between Zero and ZeroPolyfill

### Remaining deprecation warnings

**`packages/dotcom-shared/src/tlaSchema.ts`:**

- `definePermissions` is deprecated but required for zero-cache permissions
- Keeping `eslint-disable` for this until Zero provides alternative

## Open questions

1. **Auth token refresh:** How to handle Clerk token refresh with new `auth` string requirement? Use `zero.connection.connect({auth: token})`?
