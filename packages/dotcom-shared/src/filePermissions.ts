import { commentRules, stampCommentAuthors } from '@tldraw/sync-collaboration'
import {
	TLNoteShape,
	TLRecord,
	TLRule,
	TLStamp,
	defaultAbilityRules,
	definePermissions,
} from '@tldraw/tlschema'

/**
 * A note's text attribution, or `undefined` when the record isn't carrying one (non-note records).
 * Rules see records at the server's schema version, so only the current field name exists.
 */
function getNoteAttribution(record: TLRecord | null): string | null | undefined {
	if (record?.typeName !== 'shape' || record.type !== 'note') return undefined
	return (record as TLNoteShape).props.textLastEditedBy
}

/**
 * A note's `textLastEditedBy` may only change to null or to the session's own user, so nobody can
 * put words in someone else's name. Updates may keep an existing author.
 */
const noteAttributionRule: TLRule<TLRecord> = (tx) => {
	for (const change of tx.changes) {
		if (change.op === 'delete') continue
		const before = change.op === 'create' ? null : getNoteAttribution(change.prev)
		const after = getNoteAttribution(change.next)
		if (after !== before && after != null && after !== tx.access.userId) {
			return 'You can only attribute note text to yourself.'
		}
	}
	return undefined
}

/**
 * Slurped notes can carry a browser-local author id, and the rule above would deny the whole
 * import over it. Re-attribute foreign text to the session's user (or to nobody, signed out).
 */
const stampNoteAttribution: TLStamp<TLRecord> = (record, access) => {
	const attribution = getNoteAttribution(record)
	if (attribution == null || attribution === access.userId) return record
	const note = record as TLNoteShape
	return { ...note, props: { ...note.props, textLastEditedBy: access.userId } }
}

/**
 * The file room's permissions. The sync worker's room and the dotcom client's `useSync` share this
 * object, so the editor denies a bad write before it is sent and the server denies it again.
 *
 * - `edit` gates canvas records and `comment` gates comment records (see `fileSessionAccess` in
 *   TLFileDurableObject for who gets which).
 * - Comments, threads, and reactions must be attributed to the session's own user.
 * - Note text attribution may only name the session's own user.
 */
export const filePermissions = definePermissions<TLRecord>({
	rules: [...defaultAbilityRules(), ...commentRules(), noteAttributionRule],
	stamps: [stampCommentAuthors(), stampNoteAttribution],
})
