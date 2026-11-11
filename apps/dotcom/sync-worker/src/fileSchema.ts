import { librarySchemaRecords, commentSchemaRecords, createTLSchema } from '@tldraw/tlschema'

// The schema for a file room. Includes the opt-in `comment` record types so comment records sync
// through the room; comments are persisted to Postgres rather than the main document blob (see
// drainCommentOutbox / loadCommentsFromPostgres). Board libraries are ordinary document records,
// saved, duplicated and exported with the file. The same records must be registered on the client
// (see fileSchemaRecords in the dotcom client) or the schemas won't match.
export const fileSyncSchema = createTLSchema({
	records: { ...commentSchemaRecords, ...librarySchemaRecords },
})

// The records a file's document snapshot can hold. Comments are left out: they live in Postgres,
// never in the document.
export const fileSnapshotSchema = createTLSchema({ records: librarySchemaRecords })
