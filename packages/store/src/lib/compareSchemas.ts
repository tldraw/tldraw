import { SerializedSchema, upgradeSchema } from './StoreSchema'

/** @public */
export const compareSchemas = (_a: SerializedSchema, _b: SerializedSchema): 0 | 1 | -1 => {
	const a = upgradeSchema(_a)
	const b = upgradeSchema(_b)
	for (const [sequenceId, bVersion] of Object.entries(b.sequences)) {
		const aVersion = a.sequences[sequenceId]
		if (!aVersion && bVersion.retroactive) {
			// a is less than b
			return -1
		} else if (aVersion && aVersion.version < bVersion.version) {
			// a is less than b
			return -1
		} else if (aVersion && aVersion.version > bVersion.version) {
			// a is greater than b
			return 1
		}
	}

	for (const [sequenceId, aVersion] of Object.entries(a.sequences)) {
		if (!b.sequences[sequenceId] && aVersion.retroactive) {
			// a is greater than b
			return 1
		}
	}

	return 0
}
