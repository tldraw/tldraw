import {
	debugFlags,
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
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'

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
			{msg('a11y.skip-to-main-content')}
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
				aria-label={translation('a11y.status')}
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
	let a11yLive = ''
	const numShapes = selectedShapeIds.length

	if (numShapes > 1) {
		a11yLive = msg('a11y.multiple-shapes').replace('{num}', numShapes.toString())
	} else if (numShapes === 1) {
		const shapeId = selectedShapeIds[0]
		const shape = editor.getShape(shapeId)
		if (!shape) return ''

		const shapeUtil = editor.getShapeUtil(shape.type)

		const isMedia = ['image', 'video'].includes(shape.type)
		// Yeah, yeah this is a bit of a hack, we should get better translations.
		let shapeType = ''
		if (shape.type === 'geo') {
			shapeType = msg(`geo-style.${(shape as TLGeoShape).props.geo}`)
		} else if (isMedia) {
			shapeType = msg(`a11y.shape-${shape.type}`)
		} else {
			shapeType = msg(`tool.${shape.type}`)
		}

		// Get shape index in reading order
		const readingOrderShapes = editor.getCurrentPageShapesInReadingOrder()
		const currentShapeIndex = (readingOrderShapes.findIndex((s) => s.id === shapeId) + 1).toString()
		const totalShapes = readingOrderShapes.length.toString()
		const shapeIndex = msg('a11y.shape-index')
			.replace('{num}', currentShapeIndex)
			.replace('{total}', totalShapes)

		// Get describing text (alt text or shape text)
		const describingText = shapeUtil.getAriaDescriptor(shape) || shapeUtil.getText(shape) || ''

		// Build the full announcement
		a11yLive = (describingText ? `${describingText}, ` : '') + `${shapeType}. ${shapeIndex}`
	}

	return a11yLive
}

/** @public */
export const useSelectedShapesAnnouncer = () => {
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
			const handleKeyUp = (e: KeyboardEvent) => {
				const el = document.activeElement
				if (
					e.key === 'Tab' &&
					el &&
					el !== document.body &&
					!el.classList.contains('tl-container')
				) {
					const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent
					if (label) {
						log(label)
					}
				}
			}

			if (msg) {
				log(msg)
			}

			document.addEventListener('keyup', handleKeyUp)
			return () => document.removeEventListener('keyup', handleKeyUp)
		}
	}, [container, msg])
}
