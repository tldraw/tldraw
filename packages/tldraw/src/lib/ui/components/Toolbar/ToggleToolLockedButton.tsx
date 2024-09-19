import { useEditor, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'

interface ToggleToolLockedButtonProps {
	activeToolId?: string
}

export function ToggleToolLockedButton({ activeToolId }: ToggleToolLockedButtonProps) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const msg = useTranslation()

	const isToolLocked = useValue('is tool locked', () => editor.getInstanceState().isToolLocked, [
		editor,
	])
	const tool = useValue('current tool', () => editor.getCurrentTool(), [editor])

	if (!activeToolId || !tool.isLockable) return null

	return (
		<TldrawUiButton
			type="normal"
			title={msg('action.toggle-tool-lock')}
			data-testid="tool-lock"
			className={classNames('tlui-toolbar__lock-button', {
				'tlui-toolbar__lock-button__mobile': breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
			})}
			onClick={() => editor.updateInstanceState({ isToolLocked: !isToolLocked })}
		>
			<TldrawUiButtonIcon icon={isToolLocked ? 'lock' : 'unlock'} small />
		</TldrawUiButton>
	)
}
