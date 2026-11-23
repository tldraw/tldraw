/**
 * The capabilities that the UI asks about before it offers an action. A capability is an action
 * with no extra data. Add your own with `declare module '@tldraw/editor'`.
 *
 * @public
 */
export interface TLCapabilities {
	'create-shape': null
	'edit-shape': null
	'delete-shape': null
	'create-page': null
	'edit-page': null
	'delete-page': null
}

/** @public */
export type TLCapability = keyof TLCapabilities
