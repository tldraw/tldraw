---
title: IndexedDB migrations
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - IndexedDB
  - migrations
  - schema
status: published
date: 12/21/2025
order: 2
---

# IndexedDB migrations

When you're running tldraw in multiple browser tabs, those tabs all share the same IndexedDB database. If one tab updates to a newer version of tldraw with schema changes, the tabs are now running different code against the same data. Without coordination, the older tab might corrupt the database by writing records the newer schema doesn't understand.

We handle this through a cross-tab reload protocol. When tabs detect schema mismatches via `BroadcastChannel`, they negotiate who needs to reload. The newer tab tells the older to refresh. A 5-second grace period prevents infinite reload loops when you've just opened a tab.

## Schema versioning

Every tldraw schema serializes to a version number. When you persist data to IndexedDB, the schema version goes along with it:

```typescript
{
  schemaVersion: 2,
  sequences: {
    'com.tldraw.store': 3,
    'com.tldraw.shape': 4,
    'com.tldraw.shape.arrow': 2
  }
}
```

Each sequence ID (like `com.tldraw.shape.arrow`) maps to a version number. This tells us which migrations have been applied. When loading data, we call `getMigrationsSince(persistedSchema)` to get the list of migrations needed to bring that data up to date.

## Cross-tab messages

Tabs communicate via `BroadcastChannel` to coordinate their schema versions. Every message includes the sender's schema:

```typescript
interface SyncMessage {
	type: 'diff'
	storeId: string
	changes: RecordsDiff<UnknownRecord>
	schema: SerializedSchema
}

interface AnnounceMessage {
	type: 'announce'
	schema: SerializedSchema
}
```

When a tab receives a message, it compares the sender's schema to its own. The comparison happens through `getMigrationsSince(msg.schema)`:

```typescript
const res = this.store.schema.getMigrationsSince(msg.schema)

if (!res.ok) {
	// We are older, need to reload
} else if (res.value.length > 0) {
	// They are older, tell them to reload
} else {
	// Same version, all good
}
```

If `getMigrationsSince` returns an error, it means the persisted schema is newer than the current code can handle—this tab is running old code. If it returns migrations, the sender is behind and needs to update.

## The reload protocol

When a tab detects it's running older code, it reloads the page:

```typescript
if (!res.ok) {
	const timeSinceInit = Date.now() - this.initTime
	if (timeSinceInit < 5000) {
		onLoadError(new Error('Schema mismatch, please close other tabs and reload the page'))
		return
	}
	this.isReloading = true
	window?.location?.reload?.()
	return
}
```

The 5-second check prevents infinite reload loops. If this tab was just opened and is already out of date, something's wrong—maybe the user has two different tldraw versions running. Instead of reloading forever, we show an error.

When a tab detects the sender is older, it tells them to reload:

```typescript
if (res.value.length > 0) {
	this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
	this.shouldDoFullDBWrite = true
	this.persistIfNeeded()
	return
}
```

The `announce` message contains the newer schema. When the older tab receives it, the `!res.ok` branch triggers and that tab reloads. The newer tab also schedules a full database write in case the older tab wrote incompatible data before reloading.

## Why migrations matter here

You might wonder: why not just reload whenever schemas differ? The problem is that reloading loses user work. If tabs reload every time they see a different schema version, users would lose changes whenever they opened a second tab.

The migration system lets us be smarter. When `getMigrationsSince` succeeds, we know the difference is forward-compatible—the newer tab can migrate the older data automatically. Only when migrations can't resolve the difference (the persisted schema is _newer_ than the code) do we force a reload.

This asymmetry is intentional. A newer tab can always bring older data forward through migrations. An older tab can't safely write to a database with a newer schema—it would risk data corruption by writing records the newer schema doesn't understand.

## The 5-second grace period

The grace period exists because of a specific race condition: you open a tab, it loads tldraw v1, starts reading from IndexedDB, and during initialization, another tab writes with v2's schema. The v1 tab receives the announce message before it's finished loading and tries to reload. But the reload brings up v1 again (the page hasn't changed), and the cycle repeats.

By tracking `initTime` and refusing to reload within 5 seconds, we break the loop. If a tab is brand new and already incompatible, the user needs to close one of the tabs manually. The error message tells them so.

This case only happens when you have truly incompatible versions running—maybe you opened tldraw.com in one tab and localhost:5420 in another, both pointing at the same persistence key. In normal usage, all tabs run the same code and the reload protocol works cleanly.

## Where this lives

The cross-tab logic is in `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts` (lines 205-248). The `getMigrationsSince` implementation is in `/packages/store/src/lib/StoreSchema.ts` (lines 425-491). The message types are defined at the top of `TLLocalSyncClient.ts` (lines 29-44).
