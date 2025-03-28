import {
	debugFlags,
	EffectScheduler,
	throttle,
	TLGeoShape,
	TLImageShape,
	TLShapeId,
	TLVideoShape,
	useContainer,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { memo, useCallback, useEffect, useRef } from 'react'
import { TLUiA11y, useA11y } from '../context/a11y'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'

export function SkipToMainContent() {
	const editor = useEditor()
	const msg = useTranslation()
	const button = useRef<HTMLButtonElement>(null)

	const handleNavigateToFirstShape = useCallback(() => {
		button.current?.blur()
		const shapes = editor.getCurrentPageShapesInReadingOrder()
		if (!shapes.length) return
		editor.setSelectedShapes([shapes[0].id])
		editor.zoomToSelectionIfOffscreen(256)

		// N.B. If we don't do this, then we go into editing mode for some reason...
		// Not sure of a better solution at the moment...
		editor.timers.setTimeout(() => editor.getContainer().focus(), 100)
	}, [editor])

	return (
		<TldrawUiButton
			ref={button}
			type="normal"
			tabIndex={1}
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
	const msg = useValue('a11y-msg', () => a11y.currentMsg.get(), [])
	useA11yDebug(msg)

	useSelectedShapesAnnouncer()

	return (
		msg.msg && (
			<div
				aria-live={msg.priority || 'polite'}
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

/** @public */
export const useSelectedShapesAnnouncer = () => {
	const editor = useEditor()
	const a11y = useA11y()
	const msg = useTranslation()

	useEffect(() => {
		const setA11yLive = (shapes: TLShapeId[]) => {
			let a11yLive = ''
			const numShapes = shapes.length
			if (numShapes > 1) {
				a11yLive = msg('a11y.multiple-shapes').replace('{num}', numShapes.toString())
			} else if (numShapes === 1) {
				const shapeId = shapes[0]
				const shape = editor.getShape(shapeId)
				if (!shape) return
				const shapeUtil = editor.getShapeUtil(shape.type)
				a11yLive = shapeUtil.getAriaLiveText(shape) ?? ''
				if (!a11yLive) {
					const text = shapeUtil.getText(shape)
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
					const readingOrderShapes = editor.getCurrentPageShapesInReadingOrder()
					const currentShapeIndex = (
						readingOrderShapes.findIndex((s) => s.id === shapeId) + 1
					).toString()
					const totalShapes = readingOrderShapes.length.toString()
					const shapeIndex = msg('a11y.shape-index')
						.replace('{num}', currentShapeIndex)
						.replace('{total}', totalShapes)
					let textStr = ''
					if (isMedia) {
						const altText = (shape as TLImageShape | TLVideoShape).props.altText
						textStr = altText ? `, ${msg('a11y.text')}: ${altText}` : ''
					} else {
						textStr = text ? `, ${msg('a11y.text')}: ${text}` : ''
					}

					// Example: Arrow left, Shape, 3 of 9, Text: hello, world'
					a11yLive = `${shapeType}, ${msg('a11y.shape')}, ${shapeIndex}${textStr}`
				}
			}

			a11y.announce({ msg: a11yLive })
		}
		const setA11yLiveDebounced = throttle(setA11yLive, 1000)

		const scheduler = new EffectScheduler('useSelectedShapesAnnouncer', () => {
			const selectedShapes = editor.getSelectedShapeIds()
			setA11yLiveDebounced(selectedShapes)
		})

		scheduler.attach()
		scheduler.execute()

		return () => {
			scheduler.detach()
			setA11yLiveDebounced.cancel()
		}
	}, [editor, a11y, msg])
}

const useA11yDebug = (msg: TLUiA11y) => {
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
				if (e.key === 'Tab' && el && el !== document.body && el !== container) {
					const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent
					if (label) {
						log(label)
					}
				}
			}

			if (msg.msg) {
				log(msg.msg)
			}

			document.addEventListener('keyup', handleKeyUp)
			return () => document.removeEventListener('keyup', handleKeyUp)
		}
	}, [container, msg])
}
