import { debugFlags, useValue } from '@tldraw/editor'
import { memo, useEffect } from 'react'
import { useA11y } from '../context/a11y'

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
