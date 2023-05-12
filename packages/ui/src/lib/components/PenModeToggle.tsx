import { useApp } from '@tldraw/editor'
import { track } from 'signia-react'
import { useActions } from '../hooks/useActions'
import { Button } from './primitives/Button'

export const ExitPenMode = track(function ExitPenMode() {
	const app = useApp()

	const isPenMode = app.isPenMode

	const actions = useActions()

	if (!isPenMode) return null

	const action = actions['exit-pen-mode']

	return (
		<Button
			label={action.label}
			iconLeft={action.icon}
			onClick={() => action.onSelect('helper-buttons')}
		/>
	)
})
