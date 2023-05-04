import { useUiEvents } from '@tldraw/editor'
import { memo } from 'react'
import { useActions } from '../hooks/useActions'
import { useCanUndo } from '../hooks/useCanUndo'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import { kbdStr } from './primitives/shared'

export const UndoButton = memo(function UndoButton() {
	const msg = useTranslation()
	const canUndo = useCanUndo()
	const actions = useActions()
	const track = useUiEvents()

	const undo = actions['undo']

	const onSelect = () => {
		track('ui.main.click', 'undo')
		undo.onSelect()
	}

	return (
		<Button
			data-wd="main.undo"
			icon={undo.icon}
			title={`${msg(undo.label!)} ${kbdStr(undo.kbd!)}`}
			disabled={!canUndo}
			onClick={onSelect}
			smallIcon
		/>
	)
})
