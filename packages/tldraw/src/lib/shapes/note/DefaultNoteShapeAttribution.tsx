import { TLNoteShape } from '@tldraw/editor'
import { ComponentType } from 'react'
import { TldrawUiTooltip } from '../../ui/components/primitives/TldrawUiTooltip'

/**
 * Props for the {@link DefaultNoteShapeAttribution} component.
 *
 * @public
 */
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
 * The default attribution badge shown in the corner of a note shape — the display name of the user
 * who last edited the note's text.
 *
 * Override it (or hide it) with the note shape util's `AttributionComponent` option:
 *
 * ```tsx
 * // hide the attribution badge
 * <Tldraw shapeUtils={[NoteShapeUtil.configure({ AttributionComponent: null })]} />
 *
 * // render your own
 * <Tldraw shapeUtils={[NoteShapeUtil.configure({ AttributionComponent: (props) => <MyBadge {...props} /> })]} />
 * ```
 *
 * @public @react
 */
export function DefaultNoteShapeAttribution({
	name,
	firstName,
	color,
	scale,
	variant,
}: TLNoteShapeAttributionProps) {
	if (variant === 'export') {
		return (
			<div
				className="tl-note__attribution"
				style={{
					fontSize: 11,
					color,
					opacity: 0.6,
				}}
			>
				{firstName}
			</div>
		)
	}

	return (
		<TldrawUiTooltip content={name} side="bottom">
			<div
				className="tl-note__attribution"
				style={{
					['--note-attribution-scale' as string]: scale,
					fontSize: 11 * scale,
					color,
					opacity: 0.6,
				}}
			>
				{firstName}
			</div>
		</TldrawUiTooltip>
	)
}

/**
 * The component used to render a note shape's attribution badge, or `null` to hide it.
 *
 * @public
 */
export type TLNoteShapeAttributionComponent = ComponentType<TLNoteShapeAttributionProps> | null
