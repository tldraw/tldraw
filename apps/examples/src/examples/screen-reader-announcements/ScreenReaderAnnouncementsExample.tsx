import { useState } from 'react'
import { Tldraw, TldrawUiButton, useA11y, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './screen-reader-announcements.css'

function CustomAnnouncementPanel() {
	const editor = useEditor()
	// [1]
	const a11y = useA11y()
	const [isEnabled, setIsEnabled] = useState(false)

	// [2]
	const handleActionConfirmation = () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length > 0) {
			// Simulate an action being performed
			a11y.announce({
				msg: `Action completed for ${selectedShapes.length} shape${selectedShapes.length === 1 ? '' : 's'}`,
				priority: 'polite',
			})
		} else {
			a11y.announce({
				msg: 'No shapes selected',
				priority: 'polite',
			})
		}
	}

	// [3]
	const handleValidation = () => {
		const selectedShapes = editor.getSelectedShapes()
		if (selectedShapes.length === 0) {
			a11y.announce({
				msg: 'Validation failed: No shapes selected',
				priority: 'assertive',
			})
		} else {
			const hasText = selectedShapes.some((shape) => {
				const util = editor.getShapeUtil(shape)
				return util.getText(shape)
			})
			if (!hasText) {
				a11y.announce({
					msg: 'Validation failed: Selected shapes must contain text',
					priority: 'assertive',
				})
			} else {
				a11y.announce({
					msg: 'Validation passed',
					priority: 'polite',
				})
			}
		}
	}

	// [4]
	const handleToggle = () => {
		const newState = !isEnabled
		setIsEnabled(newState)
		a11y.announce({
			msg: `Feature ${newState ? 'enabled' : 'disabled'}`,
			priority: 'polite',
		})
	}

	return (
		<div className="tlui-menu announcement-panel">
			<TldrawUiButton type="normal" onClick={handleActionConfirmation}>
				Perform action
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={handleValidation}>
				Validate selection
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={handleToggle}>
				{isEnabled ? 'Disable' : 'Enable'} feature
			</TldrawUiButton>
		</div>
	)
}

export default function ScreenReaderAnnouncementsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={{
					TopPanel: CustomAnnouncementPanel,
				}}
			/>
		</div>
	)
}

/*
[1]
The useA11y() hook provides access to the accessibility manager. It must be called
within a component that's rendered inside the Tldraw component.

[2]
Polite announcements are used for informational messages that don't require immediate
attention. They wait for the screen reader to finish its current announcement before
speaking. This is appropriate for action confirmations and status updates.

[3]
Assertive announcements are used for critical messages that need immediate attention,
such as validation errors. They interrupt the current screen reader output to ensure
the user hears the message right away.

[4]
State change announcements help keep users informed about the current state of the
application. Use polite priority for state changes unless they're critical.
*/
