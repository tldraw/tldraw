import { TLNoteShape } from '@tldraw/editor'

/** @public */
export interface TLNoteShapeAttributionProps {
	/** The note shape the attribution belongs to. */
	shape: TLNoteShape
	/** The full display name of the user who last edited the note's text. */
	name: string
	/** The first name (the part shown in the badge). */
	firstName: string
	/** The label color to use for the badge. */
	color: string
	/** The note's scale. Only meaningful for the `'canvas'` variant. */
	scale: number
	/**
	 * Where the attribution is being rendered. The `'canvas'` variant renders the interactive badge
	 * (with a tooltip); the `'export'` variant renders static markup suitable for an SVG/PNG export.
	 */
	variant: 'canvas' | 'export'
}

/**
 * The component used to render a note shape's attribution badge, or `null` to hide it.
 *
 * @public
 */
export type TLNoteShapeAttributionComponent =
	| import('react').ComponentType<TLNoteShapeAttributionProps>
	| null
