import { CustomRecordInfo } from './records/TLCustomRecord'

/**
 * The minimal plugin shape shared by client and server: an id plus optional custom record
 * registrations. `TldrawPlugin` (tldraw) and `TLSyncPlugin` (sync-core) extend this.
 *
 * @public
 */
export interface TLSchemaPlugin {
	/** Unique plugin id, e.g. `'tldraw.comments'`. Duplicate ids throw at merge time. */
	id: string
	/** Custom record types this plugin registers, keyed by type name. */
	records?: Record<string, CustomRecordInfo>
}

/** @public */
export function assertUniquePluginIds(plugins: readonly TLSchemaPlugin[]): void {
	const seen = new Set<string>()
	for (const plugin of plugins) {
		if (seen.has(plugin.id)) {
			throw new Error(`Duplicate plugin id '${plugin.id}'`)
		}
		seen.add(plugin.id)
	}
}

/**
 * Merges the `records` of a list of plugins into an existing custom-records map. Throws on
 * duplicate plugin ids and on record type-name collisions (across plugins or with `existing`).
 *
 * @public
 */
export function mergeSchemaPluginRecords(
	plugins: readonly TLSchemaPlugin[] | undefined,
	existing?: Record<string, CustomRecordInfo>
): Record<string, CustomRecordInfo> | undefined {
	if (!plugins || plugins.length === 0) return existing
	assertUniquePluginIds(plugins)
	const result: Record<string, CustomRecordInfo> = { ...existing }
	for (const plugin of plugins) {
		for (const [typeName, config] of Object.entries(plugin.records ?? {})) {
			if (typeName in result) {
				throw new Error(
					`Record type '${typeName}' from plugin '${plugin.id}' is already registered`
				)
			}
			result[typeName] = config
		}
	}
	return result
}
