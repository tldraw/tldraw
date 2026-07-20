import { JsonObject } from 'tldraw'

/** A comment author's display identity, resolved from an author id.
 * @public */
export interface CommentAuthor {
	name: string
	/** The author's color (any CSS color) — colors their avatar and pins.
	 *  Omit for the default tint. */
	color?: string
	/** User-defined metadata for the author, never read by the toolkit (cf. a shape's `meta`). */
	meta?: JsonObject
}
