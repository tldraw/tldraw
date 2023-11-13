import { useEditor, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { Button } from '../primitives/Button'

interface ToggleToolLockedButtonProps {
	activeToolId?: string
}

const NOT_LOCKABLE_TOOLS = [
	'select',
	'hand',
	'draw',
	'eraser',
	'text',
	'zoom',
	'laser',
	'highlight',
]

export function ToggleToolLockedButton({ activeToolId }: ToggleToolLockedButtonProps) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const msg = useTranslation()

	const isToolLocked = useValue('is tool locked', () => editor.getInstanceState().isToolLocked, [
		editor,
	])

	if (!activeToolId || NOT_LOCKABLE_TOOLS.includes(activeToolId)) return null

	return (
		<Button
			type="normal"
			title={msg('action.toggle-tool-lock')}
			className={classNames('tlui-toolbar__lock-button', {
				'tlui-toolbar__lock-button__mobile': breakpoint < 5,
			})}
			icon={isToolLocked ? 'lock' : 'unlock'}
			onClick={() => editor.updateInstanceState({ isToolLocked: !isToolLocked })}
			smallIcon
		/>
	)
}
