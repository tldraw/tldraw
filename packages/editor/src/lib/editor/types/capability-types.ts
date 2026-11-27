import { TLCreateShapePartial, TLPage, TLShape } from '@tldraw/tlschema'

/**
 * The capabilities that the UI asks about before it offers an action, with the data each one can
 * carry. The data is the minimum a check needs, and a caller can leave it out, so a check must
 * work without it. Add your own with `declare module '@tldraw/editor'`.
 *
 * @public
 */
export interface TLCapabilities {
	/** Create shapes. A partial can hold only a type, for example from a toolbar tool. */
	'create-shapes': { shapes: TLCreateShapePartial[] }
	'edit-shapes': { shapes: TLShape[] }
	'delete-shapes': { shapes: TLShape[] }
	'create-page': null
	'edit-page': { page: TLPage }
	'delete-page': { page: TLPage }
}

/** @public */
export type TLCapability = keyof TLCapabilities
