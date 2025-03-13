import { useValue } from '@tldraw/editor'
import { memo } from 'react'
import { useA11y } from '../context/a11y'

/** @public @react */
export const DefaultA11y = memo(function TldrawUiA11y() {
	const currentMsg = useA11y()
	const msg = useValue('a11y-msg', () => currentMsg.currentMsg.get(), [])

	return (
		msg.msg && (
			<div
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
