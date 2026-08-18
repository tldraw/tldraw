import { TlaEffectOutbox, TlaFile } from '@tldraw/dotcom-shared'

// An effect_outbox row whose tableName is 'file'.
export interface FileEffectRow extends TlaEffectOutbox {
	payload: TlaFile
	prevPayload: TlaFile | null
}

// A file's `update` row is a publish when it becomes published (or republishes with a new
// lastPublished timestamp) and an unpublish when it stops being published.
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

export interface FileEffectDeps {
	getCurrentFile(fileId: string): Promise<TlaFile | undefined>
	notifyInsert(file: TlaFile): Promise<void> // room DO appFileRecordCreated
	notifyUpdate(file: TlaFile): Promise<void> // room DO appFileRecordDidUpdate (fresh row)
	notifyDelete(fileRow: TlaFile): Promise<void> // room DO appFileRecordDidDelete (outbox payload)
	publish(file: TlaFile): Promise<void>
	unpublish(file: TlaFile): Promise<void>
}

export async function processFileEffect(deps: FileEffectDeps, genericRow: TlaEffectOutbox) {
	// Invariant: caller must route only tableName === 'file' rows here.
	const row = genericRow as FileEffectRow
	if (row.command === 'delete') {
		// Terminal: appFileRecordDidDelete is self-guarded, no staleness check needed.
		await deps.notifyDelete(row.payload)
		return
	}
	// Staleness guard: act on present truth, treat the row as a wake-up signal.
	const current = await deps.getCurrentFile(row.entityId)
	if (!current) return // hard-deleted since; a delete row follows or already ran
	if (row.command === 'insert') {
		await deps.notifyInsert(current)
		return
	}
	await deps.notifyUpdate(current)
	const transition = getPublishTransition(row)
	if (
		transition === 'publish' &&
		// Publishing a trashed file is a race artifact; never publish it. Skipping is safe:
		// undeleteFile bumps lastPublished on restore, so a fresh publish runs then.
		!current.isDeleted &&
		current.published &&
		current.lastPublished === row.payload.lastPublished
	) {
		await deps.publish(current)
	} else if (transition === 'unpublish' && !current.published) {
		await deps.unpublish(current)
	}
}
