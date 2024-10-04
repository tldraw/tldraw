/**
 * What is going on in this file?
 *
 * We had some bad early assumptions about how we would store documents.
 * Which ended up with us generating random persistenceKey strings for the
 * 'scratch' document for each user (i.e. each browser context), and storing it in localStorage.
 *
 * Many users still have that random string in their localStorage so we need to load it. But for new
 * users it does not need to be unique and we can just use a constant.
 */

import { getFromLocalStorage, setInLocalStorage } from 'tldraw'

// DO NOT CHANGE THESE WITHOUT ADDING MIGRATION LOGIC. DOING SO WOULD WIPE ALL EXISTING LOCAL DATA.
const defaultDocumentKey = 'TLDRAW_DEFAULT_DOCUMENT_NAME_v2'

export const SCRATCH_PERSISTENCE_KEY =
	getFromLocalStorage(defaultDocumentKey) ?? 'tldraw_document_v3'
setInLocalStorage(defaultDocumentKey, SCRATCH_PERSISTENCE_KEY)
