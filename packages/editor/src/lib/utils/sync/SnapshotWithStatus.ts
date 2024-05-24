import { TLStoreSnapshot } from '@tldraw/tlschema'
import { TLEditorSnapshot } from '../../config/TLEditorSnapshot'

/** @public */
export type TLSnapshotWithStatus =
	| {
			readonly status: 'ready'
			readonly snapshot: TLEditorSnapshot | TLStoreSnapshot
			readonly error?: undefined
	  }
	| {
			readonly status: 'error'
			readonly snapshot?: undefined
			readonly error: Error
	  }
	| {
			readonly status: 'loading'
			readonly snapshot?: undefined
			readonly error?: undefined
	  }
