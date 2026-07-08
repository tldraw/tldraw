import { StoreSchema, UnknownRecord } from '@tldraw/store'
import { TLSchemaPlugin } from '@tldraw/tlschema'
import { TLSyncForwardDiff } from './TLSyncStorage'

/**
 * Server-side plugin bundle for tldraw sync. Extends `TLSchemaPlugin` with object-lane types and
 * a committed-changes hook. Pass via the `plugins` option on `TLSocketRoom` and the sync storages.
 *
 * @public
 */
export interface TLSyncPlugin<R extends UnknownRecord = UnknownRecord> extends TLSchemaPlugin {
	/** Record type names served through the object-store lane (gated by session objectAccess). */
	objectTypes?: readonly string[]
	/** Called after each commit with the forward diff. Errors are caught and logged, never thrown. */
	onCommittedChanges?(args: { diff: TLSyncForwardDiff<R>; documentClock: number }): void
}

/** Deduped union of plugin objectTypes and any extra host-provided types. @public */
export function getPluginObjectTypes(
	plugins: readonly TLSyncPlugin<any>[] | undefined,
	extra?: readonly string[]
): string[] {
	return [...new Set([...(extra ?? []), ...(plugins ?? []).flatMap((p) => p.objectTypes ?? [])])]
}

/** Throws unless every plugin record type exists in the schema. @internal */
export function assertSchemaIncludesPluginRecords(
	schema: StoreSchema<any, any>,
	plugins: readonly TLSyncPlugin<any>[]
): void {
	for (const plugin of plugins) {
		for (const typeName of Object.keys(plugin.records ?? {})) {
			if (!(typeName in schema.types)) {
				throw new Error(
					`Schema is missing record type '${typeName}' required by plugin '${plugin.id}'. ` +
						`Register the plugin's records via createTLSchema({ records }) or omit the schema option.`
				)
			}
		}
	}
}
