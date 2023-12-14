import { track, useEditor } from '@tldraw/editor'
import { useActions } from '../hooks/useActions'
import { Button } from './primitives/Button'

export const ExitPenMode = track(function ExitPenMode() {
	const editor = useEditor()

	const isPenMode = editor.getInstanceState().isPenMode

	const actions = useActions()

	if (!isPenMode) return null

	const action = actions['exit-pen-mode']

	return (
		<Button
			type="normal"
			label={action.label}
			iconLeft={action.icon}
			onClick={() => action.onSelect('helper-buttons')}
		/>
	)
})
