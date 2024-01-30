import { SerializedSchema } from './StoreSchema'

type Legacy = Extract<SerializedSchema, { schemaVersion: 1 }>

const legacyCompareSchemas = (a: Legacy, b: Legacy): 0 | 1 | -1 => {
	if (a.schemaVersion > b.schemaVersion) {
		return 1
	}
	if (a.schemaVersion < b.schemaVersion) {
		return -1
	}
	if (a.storeVersion > b.storeVersion) {
		return 1
	}
	if (a.storeVersion < b.storeVersion) {
		return -1
	}
	for (const key of Object.keys(a.recordVersions)) {
		const aRecordVersion = a.recordVersions[key]
		const bRecordVersion = b.recordVersions[key]
		if (aRecordVersion.version > bRecordVersion.version) {
			return 1
		}
		if (aRecordVersion.version < bRecordVersion.version) {
			return -1
		}
		if ('subTypeVersions' in aRecordVersion && !('subTypeVersions' in bRecordVersion)) {
			// todo: this assumes that subtypes were added in an up migration rather than removed. We should probably
			// make sure that in either case the parent version is bumped
			return 1
		}

		if (!('subTypeVersions' in aRecordVersion) && 'subTypeVersions' in bRecordVersion) {
			// todo: this assumes that subtypes were added in an up migration rather than removed. We should probably
			// make sure that in either case the parent version is bumped
			return -1
		}

		if (!('subTypeVersions' in aRecordVersion) || !('subTypeVersions' in bRecordVersion)) {
			// this will never happen
			continue
		}

		for (const subType of Object.keys(aRecordVersion.subTypeVersions)) {
			const aSubTypeVersion = aRecordVersion.subTypeVersions[subType]
			const bSubTypeVersion = bRecordVersion.subTypeVersions[subType]
			if (aSubTypeVersion > bSubTypeVersion) {
				return 1
			}
			if (aSubTypeVersion < bSubTypeVersion) {
				return -1
			}
		}
	}
	return 0
}

/** @public */
export const compareSchemas = (a: SerializedSchema, b: SerializedSchema): 0 | 1 | -1 => {
	if (a.schemaVersion === 1 && b.schemaVersion === 1) {
		return legacyCompareSchemas(a, b)
	} else if (a.schemaVersion === 1 && b.schemaVersion === 2) {
		return -1
	} else if (a.schemaVersion === 2 && b.schemaVersion === 1) {
		return 1
	}

	// both schemas are the new kind
	if (a.schemaVersion !== 2 || b.schemaVersion !== 2)
		throw new Error(`Invalid schema versions ${a.schemaVersion} and ${b.schemaVersion}`)
	if (a.versionHistory[0] !== b.versionHistory[0]) throw new Error('Incompatible schema comparison')
	// we should really validate the rest of the shorter version history against the longer one
  // but that will happen when doing any migrations anyway.
	// so for now i guess we just compare the length of the id array.
	if (a.versionHistory.length < b.versionHistory.length) {
		return -1
	} else if (a.versionHistory.length > b.versionHistory.length) {
		return 1
	} else {
		return 0
	}
}
