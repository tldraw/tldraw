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

	const undo = actions['undo']

	return (
		<Button
			data-testid="main.undo"
			icon={undo.icon}
			title={`${msg(undo.label!)} ${kbdStr(undo.kbd!)}`}
			disabled={!canUndo}
			onClick={() => undo.onSelect('quick-actions')}
			smallIcon
		/>
	)
})
