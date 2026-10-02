import {
	debugFlags,
	defineMessages,
	Editor,
	TLGeoShape,
	TLShapeId,
	unsafe__withoutCapture,
	useContainer,
	useEditor,
	useMaybeEditor,
	useReactor,
	useValue,
} from '@tldraw/editor'
import { memo, MouseEvent, useCallback, useEffect, useRef } from 'react'
import { useA11y } from '../context/a11y'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { styleMessageId } from '../styleMessages'
import { suppressBackToContent } from './HelperButtons/BackToContent'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
// Only the ids nothing else declares; the rest are declared with what they name.
const messages = defineMessages({
	a11yMultipleShapes: { id: 'a11y.multiple-shapes', defaultMessage: '{num} shapes selected' },
	a11yShapeIndex: { id: 'a11y.shape-index', defaultMessage: '{num} of {total}' },
	a11ySkipToMainContent: {
		id: 'a11y.skip-to-main-content',
		defaultMessage: 'Move focus to canvas',
	},
	a11yStatus: { id: 'a11y.status', defaultMessage: 'Status' },
})

// `shape.type` and a geo shape's `props.geo` compose these ids, so the extractor sees none of
// them here. The media names are declared below; the geo names live in `styleMessages`, and the
// `tool.*` names in the tool registry that labels the toolbar with the same ids.
const mediaMessages = defineMessages({
	image: { id: 'a11y.shape-image', defaultMessage: 'Image' },
	video: { id: 'a11y.shape-video', defaultMessage: 'Video' },
})

// A bookmark is a shape type with no tool of its own — it appears by pasting a URL — so its name
// isn't declared with the toolbar's and would go unextracted. Announced through `tool.${type}`
// like any other shape.
const shapeNameMessages = defineMessages({
	bookmark: { id: 'tool.bookmark', defaultMessage: 'Bookmark' },
})

export function SkipToMainContent() {
	const editor = useEditor()
	const msg = useTranslation()
	const button = useRef<HTMLButtonElement>(null)

	const handleNavigateToFirstShape = useCallback(
		(e: MouseEvent | KeyboardEvent) => {
			editor.markEventAsHandled(e)
			button.current?.blur()
			const shapes = editor.getCurrentPageShapesInReadingOrder()
			if (!shapes.length) return
			editor.setSelectedShapes([shapes[0].id])
			suppressBackToContent(editor, editor.options.animationMediumMs)
			editor.zoomToSelectionIfOffscreen(256, {
				animation: {
					duration: editor.options.animationMediumMs,
				},
				inset: 0,
			})

			// N.B. If we don't do this, then we go into editing mode for some reason...
			// Not sure of a better solution at the moment...
			editor.timers.setTimeout(() => editor.getContainer().focus(), 100)
		},
		[editor]
	)

	return (
		<TldrawUiButton
			ref={button}
			type="low"
			tabIndex={0}
			className="tl-skip-to-main-content"
			onClick={handleNavigateToFirstShape}
		>
			{msg(messages.a11ySkipToMainContent.id)}
		</TldrawUiButton>
	)
}

/** @public @react */
export const DefaultA11yAnnouncer = memo(function TldrawUiA11yAnnouncer() {
	const a11y = useA11y()
	const translation = useTranslation()
	const msg = useValue('a11y-msg', () => a11y.currentMsg.get(), [])
	useA11yDebug(msg.msg)

	useSelectedShapesAnnouncer()

	return (
		msg.msg && (
			<div
				aria-label={translation(messages.a11yStatus.id)}
				aria-live={msg.priority || 'assertive'}
				role="status"
				aria-hidden="false"
				style={{
					position: 'absolute',
					top: '-10000px',
					left: '-10000px',
				}}
			>
				{msg.msg}
			</div>
		)
	)
})

/**
 * Core function to generate accessibility announcements for selected shapes
 * @public
 */
export function generateShapeAnnouncementMessage(args: {
	editor: Editor
	selectedShapeIds: TLShapeId[]
	msg(id: string, values?: Record<string, any>): string
}) {
	const { editor, selectedShapeIds, msg } = args
	const numShapes = selectedShapeIds.length

	if (numShapes > 1) {
		return msg(messages.a11yMultipleShapes.id, { num: numShapes })
	}
	if (numShapes !== 1) return ''

	const shapeId = selectedShapeIds[0]
	const shape = editor.getShape(shapeId)
	if (!shape) return ''

	const shapeUtil = editor.getShapeUtil(shape.type)

	// A shape util can name itself via an ICU message; otherwise fall back to the key lookup.
	const shapeType =
		shapeUtil.getShapeName(shape) ??
		(shape.type === 'geo'
			? msg(styleMessageId('geo', (shape as TLGeoShape).props.geo))
			: shape.type === 'image' || shape.type === 'video'
				? msg(mediaMessages[shape.type as 'image' | 'video'].id)
				: msg(
						shapeNameMessages[shape.type as keyof typeof shapeNameMessages]?.id ??
							`tool.${shape.type}`
					))

	// Get shape index in reading order
	const readingOrderShapes = editor.getCurrentPageShapesInReadingOrder()
	const currentShapeIndex = readingOrderShapes.findIndex((s) => s.id === shapeId) + 1
	const shapeIndex = msg(messages.a11yShapeIndex.id, {
		num: currentShapeIndex,
		total: readingOrderShapes.length,
	})

	// Get describing text (alt text or shape text)
	const describingText = shapeUtil.getAriaDescriptor(shape) || shapeUtil.getText(shape) || ''

	// Build the full announcement
	return (describingText ? `${describingText}, ` : '') + `${shapeType}. ${shapeIndex}`
}

/** @public */
export function useSelectedShapesAnnouncer() {
	const editor = useMaybeEditor()
	const a11y = useA11y()
	const msg = useTranslation()

	const rPrevSelectedShapeIds = useRef<string[]>([])

	useReactor(
		'announce selection',
		() => {
			if (!editor) return

			const isInSelecting = editor.isIn('select.idle')
			if (isInSelecting) {
				const selectedShapeIds = editor.getSelectedShapeIds()
				if (selectedShapeIds !== rPrevSelectedShapeIds.current) {
					rPrevSelectedShapeIds.current = selectedShapeIds
					unsafe__withoutCapture(() => {
						const a11yLive = generateShapeAnnouncementMessage({
							editor,
							selectedShapeIds,
							msg,
						})

						if (a11yLive) {
							a11y.announce({ msg: a11yLive })
						}
					})
				}
			}
		},
		[editor, a11y, msg]
	)
}

const useA11yDebug = (msg: string | undefined) => {
	const container = useContainer()

	useEffect(() => {
		if (debugFlags.a11y.get()) {
			const log = (msg: string) => {
				// eslint-disable-next-line no-console
				console.debug(
					`%ca11y%c: ${msg}`,
					`color: white; background: #40C057; padding: 2px;border-radius: 3px;`,
					'font-weight: normal'
				)
			}
			const doc = container.ownerDocument
			const handleKeyUp = (e: KeyboardEvent) => {
				const el = doc.activeElement
				if (e.key === 'Tab' && el && el !== doc.body && !el.classList.contains('tl-container')) {
					const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent
					if (label) {
						log(label)
					}
				}
			}

			if (msg) {
				log(msg)
			}

			doc.addEventListener('keyup', handleKeyUp)
			return () => doc.removeEventListener('keyup', handleKeyUp)
		}
		return undefined
	}, [container, msg])
}
