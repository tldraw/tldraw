import { track, useEditor } from '@tldraw/editor'
import { useRef } from 'react'
import { useActions } from '../hooks/useActions'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import { kbdStr } from './primitives/shared'

export const DuplicateButton = track(function DuplicateButton() {
	const editor = useEditor()
	const actions = useActions()
	const msg = useTranslation()
	const action = actions['duplicate']
	const ref = useRef<HTMLButtonElement>(null)

	return (
		<Button
			icon={action.icon}
			type="icon"
			onClick={() => action.onSelect('quick-actions')}
			disabled={!(editor.isIn('select') && editor.getSelectedShapeIds().length > 0)}
			title={`${msg(action.label!)} ${kbdStr(action.kbd!)}`}
			smallIcon
			ref={ref}
		/>
	)
})
