import { collectionSchemaRecords } from '@tldraw/collections/schema'
import { commentSchemaRecords } from 'tldraw'

/**
 * The record types a tldraw.com file holds beyond tldraw's own: comments, which sync through the
 * file room but are stored in Postgres, and board collections, which are part of the document.
 * Every store that loads a file registers them. Must match fileSyncSchema in the sync worker, or
 * the server rejects the session as too old.
 */
export const fileSchemaRecords = { ...commentSchemaRecords, ...collectionSchemaRecords }
