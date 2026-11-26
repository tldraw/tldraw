import { librarySchemaRecords, commentSchemaRecords } from 'tldraw'

/**
 * The record types a tldraw.com file's document holds beyond tldraw's own: board libraries.
 * Must match fileSnapshotSchema in the sync worker, which validates a .tldr before creating a file.
 */
export const fileDocumentRecords = librarySchemaRecords

/**
 * Every record type a tldraw.com file room syncs: the document's, plus comments, which sync through
 * the room but are stored in Postgres. Every store that loads a file registers them. Must match
 * fileSyncSchema in the sync worker, or the server rejects the session as too old.
 */
export const fileSchemaRecords = { ...commentSchemaRecords, ...fileDocumentRecords }
