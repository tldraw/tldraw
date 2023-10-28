import { memo } from 'react'
import { useActions } from '../hooks/useActions'
import { useCanRedo } from '../hooks/useCanRedo'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import { kbdStr } from './primitives/shared'

export const RedoButton = memo(function RedoButton() {
	const msg = useTranslation()
	const canRedo = useCanRedo()
	const actions = useActions()

	const redo = actions['redo']

	return (
		<Button
			data-testid="main.redo"
			icon={redo.icon}
			type="icon"
			title={`${msg(redo.label!)} ${kbdStr(redo.kbd!)}`}
			disabled={!canRedo}
			onClick={() => redo.onSelect('quick-actions')}
			smallIcon
		/>
	)
})
