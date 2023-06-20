import { useEditor } from '@tldraw/editor'
import { track } from '@tldraw/state'
import { useActions } from '../hooks/useActions'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import { kbdStr } from './primitives/shared'

export const DuplicateButton = track(function DuplicateButton() {
	const editor = useEditor()
	const actions = useActions()
	const msg = useTranslation()
	const action = actions['duplicate']

	const noSelected = editor.selectedIds.length <= 0

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
