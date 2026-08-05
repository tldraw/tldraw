import { TlaEffectOutbox, TlaFile } from '@tldraw/dotcom-shared'

// An effect_outbox row whose tableName is 'file'.
export interface FileEffectRow extends TlaEffectOutbox {
	payload: TlaFile
	prevPayload: TlaFile | null
}

// Port of the publish/unpublish transition logic from replicator/ChangeCollator.ts getEffects().
export function getPublishTransition(
	row: Pick<FileEffectRow, 'command' | 'payload' | 'prevPayload'>
): 'publish' | 'unpublish' | null {
	if (row.command !== 'update' || !row.prevPayload) return null
	const file = row.payload
	const previous = row.prevPayload
	if (file.published && (!previous.published || file.lastPublished !== previous.lastPublished)) {
		return 'publish'
	}
	if (!file.published && previous.published) {
		return 'unpublish'
	}
	return null
}
