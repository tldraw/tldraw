import { useApp, useUiEvents } from '@tldraw/editor'
import { track } from 'signia-react'
import { useActions } from '../hooks/useActions'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import { kbdStr } from './primitives/shared'

export const DuplicateButton = track(function DuplicateButton() {
	const app = useApp()
	const actions = useActions()
	const msg = useTranslation()
	const action = actions['duplicate']
	const track = useUiEvents()

	const onSelect = () => {
		track('ui.main.click', 'duplicate')
		action.onSelect()
	}

	const noSelected = app.selectedIds.length <= 0

	return (
		<Button
			icon={action.icon}
			onClick={onSelect}
			disabled={noSelected}
			title={`${msg(action.label!)} ${kbdStr(action.kbd!)}`}
			smallIcon
		/>
	)
})
