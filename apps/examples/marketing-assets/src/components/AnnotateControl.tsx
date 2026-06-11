import { useEditor, useValue } from 'tldraw'
import { ANNOTATION_TOOL_ID } from '../annotate/AnnotationTool'

/**
 * The single canvas tool, exposed as a labelled floating control instead of the
 * default tldraw toolbar. It toggles between the annotation pen and the select
 * tool, so a reviewer can mark up assets and then get back to moving things
 * around. The keyboard shortcut (k) still works via the tools override in App.
 */
export function AnnotateControl() {
	const editor = useEditor()
	const isAnnotating = useValue(
		'is annotating',
		() => editor.getCurrentToolId() === ANNOTATION_TOOL_ID,
		[editor]
	)

	return (
		<div className="AnnotateControl" onPointerDown={editor.markEventAsHandled}>
			<button
				className={
					'AnnotateControl-button' + (isAnnotating ? ' AnnotateControl-button_active' : '')
				}
				onClick={() => editor.setCurrentTool(isAnnotating ? 'select' : ANNOTATION_TOOL_ID)}
				aria-pressed={isAnnotating}
			>
				<PenIcon />
				<span>{isAnnotating ? 'Annotating' : 'Annotate'}</span>
				<kbd className="AnnotateControl-kbd">K</kbd>
			</button>
			<p className="AnnotateControl-hint">
				{isAnnotating
					? 'Circle the part of an asset to change, then type your note. Press Esc to stop.'
					: 'Draw notes on any asset to guide the next round.'}
			</p>
		</div>
	)
}

function PenIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			width={16}
			height={16}
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			aria-hidden
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
			/>
		</svg>
	)
}
