import { debugFlags, useEditor, useValue } from '@tldraw/editor'
import { memo, useCallback, useEffect, useRef } from 'react'
import { useA11y } from '../context/a11y'
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
		editor.zoomToSelectionIfOffscreen(256, {
			animation: {
				duration: editor.options.animationMediumMs,
			},
			inset: 0,
		})

		// N.B. If we don't do this, then we go into editing mode for some reason...
		// Not sure of a better solution at the moment...
		editor.timers.setTimeout(() => editor.getContainer().focus(), 100)
	}, [editor])

	return (
		<TldrawUiButton
			ref={button}
			type="low"
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
	const currentMsg = useA11y()
	const msg = useValue('a11y-msg', () => currentMsg.currentMsg.get(), [])

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
			const handleKeyDown = (e: KeyboardEvent) => {
				const el = document.activeElement
				if (e.key === 'Tab' && el) {
					const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent
					if (label) {
						log(label)
					}
				}
			}

			if (msg.msg) {
				log(msg.msg)
			}

			document.addEventListener('keydown', handleKeyDown)
			return () => document.removeEventListener('keydown', handleKeyDown)
		}
	}, [msg])

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
