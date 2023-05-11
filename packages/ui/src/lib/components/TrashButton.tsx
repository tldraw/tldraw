import { useApp } from '@tldraw/editor'
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

	const isReadonly = useReadonly()

	if (isReadonly) return null

	const noSelected = app.selectedIds.length <= 0

	return (
		<Button
			icon={action.icon}
			onClick={() => action.onSelect('quick-actions')}
			disabled={noSelected}
			title={`${msg(action.label!)} ${kbdStr(action.kbd!)}`}
			smallIcon
		/>
	)
})
