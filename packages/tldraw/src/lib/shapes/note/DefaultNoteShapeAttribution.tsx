import { TldrawUiTooltip } from '../../ui/components/primitives/TldrawUiTooltip'
import type { TLNoteShapeAttributionProps } from './noteAttribution'

export type {
	TLNoteShapeAttributionComponent,
	TLNoteShapeAttributionProps,
} from './noteAttribution'

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
