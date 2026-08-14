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

export interface FileEffectDeps {
	getCurrentFile(fileId: string): Promise<TlaFile | undefined>
	notifyInsert(file: TlaFile): Promise<void> // room DO appFileRecordCreated
	notifyUpdate(file: TlaFile): Promise<void> // room DO appFileRecordDidUpdate (fresh row)
	notifyDelete(fileRow: TlaFile): Promise<void> // room DO appFileRecordDidDelete (outbox payload)
	publish(file: TlaFile): Promise<void>
	unpublish(file: TlaFile): Promise<void>
	// Called when a publish transition is skipped because the file is trashed - the file stays
	// `published: true` with no snapshot ever uploaded, so the published URL goes dead silently
	// unless something reports it.
	reportSkippedPublish?(file: TlaFile): void
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
	if (transition === 'publish') {
		// Staleness guard: only act (publish, or report the skip) when the row still matches
		// current state - a publish superseded by a later change, or already unpublished, was
		// never actually going to run and reporting it would be a false positive.
		if (current.published && current.lastPublished === row.payload.lastPublished) {
			if (current.isDeleted) {
				// Publishing a trashed file is a race artifact; never publish it. Report the skip -
				// restoring from trash produces no publish transition of its own, so this is the
				// only signal that the file's published snapshot is now stale.
				deps.reportSkippedPublish?.(current)
			} else {
				await deps.publish(current)
			}
		}
	} else if (transition === 'unpublish' && !current.published) {
		await deps.unpublish(current)
	}
}
