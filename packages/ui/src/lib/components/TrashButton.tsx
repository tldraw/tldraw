import { useApp, useUiEvents } from '@tldraw/editor'
import { track } from 'signia-react'
import { useActions } from '../hooks/useActions'
import { useReadonly } from '../hooks/useReadonly'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import { kbdStr } from './primitives/shared'

export const TrashButton = track(function TrashButton() {
	const app = useApp()
	const actions = useActions()
	const msg = useTranslation()
	const action = actions['delete']
	const track = useUiEvents()

	const isReadonly = useReadonly()

	const onSelect = () => {
		track('ui.main.click', 'redo')
		action.onSelect()
	}

	if (isReadonly) return null

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
