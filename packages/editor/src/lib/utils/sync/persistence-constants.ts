import { InstanceRecordType, TLInstanceId } from '@tldraw/tlschema'
import { uniqueId } from '../data'

const tabIdKey = 'TLDRAW_TAB_ID_v2' as const

const window = globalThis.window as
	| {
			navigator: Window['navigator']
			localStorage: Window['localStorage']
			sessionStorage: Window['sessionStorage']
			addEventListener: Window['addEventListener']
			TLDRAW_TAB_ID_v2?: string
	  }
	| undefined

// https://stackoverflow.com/a/9039885
function iOS() {
	if (!window) return false
	return (
		['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
			window.navigator.platform
		) ||
		// iPad on iOS 13 detection
		(window.navigator.userAgent.includes('Mac') && 'ontouchend' in document)
	)
}

// the id of the document that will be loaded if the URL doesn't contain a document id
// again, stored in localStorage
const defaultDocumentKey = 'TLDRAW_DEFAULT_DOCUMENT_NAME_v2'

/** @public */
export const DEFAULT_DOCUMENT_NAME =
	(window?.localStorage.getItem(defaultDocumentKey) as any) ?? uniqueId()
window?.localStorage.setItem(defaultDocumentKey, DEFAULT_DOCUMENT_NAME)

// the prefix for the IndexedDB store with the id matching either the URL's document id or the default document id
/** @public */
export const STORE_PREFIX = 'TLDRAW_DOCUMENT_v2'

/** @public */
export const TAB_ID: TLInstanceId =
	window?.[tabIdKey] ?? window?.sessionStorage[tabIdKey] ?? InstanceRecordType.createId()
if (window) {
	window[tabIdKey] = TAB_ID
	if (iOS()) {
		// iOS does not trigger beforeunload
		// so we need to keep the sessionStorage value around
		// and hope the user doesn't figure out a way to duplicate their tab
		// in which case they'll have two tabs with the same UI state.
		// It's not a big deal, but it's not ideal.
		// And anyway I can't see a way to duplicate a tab in iOS Safari.
		window.sessionStorage[tabIdKey] = TAB_ID
	} else {
		delete window.sessionStorage[tabIdKey]
	}
}
window?.addEventListener('beforeunload', () => {
	window.sessionStorage[tabIdKey] = TAB_ID
})

const dbNameIndexKey = 'TLDRAW_DB_NAME_INDEX_v2'

/** @internal */
export function getAllIndexDbNames(): string[] {
	const result = JSON.parse(window?.localStorage.getItem(dbNameIndexKey) || '[]') ?? []
	if (!Array.isArray(result)) {
		return []
	}
	return result
}

/** @internal */
export function addDbName(name: string) {
	const all = new Set(getAllIndexDbNames())
	all.add(name)
	window?.localStorage.setItem(dbNameIndexKey, JSON.stringify([...all]))
}
