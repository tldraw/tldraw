import { useEditor, useValue } from '@tldraw/editor'
import classNames from 'classnames'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useActions } from '../../context/actions'
import { useBreakpoint } from '../../context/breakpoints'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { kbdStr } from '../../kbd-utils'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiTooltip } from '../primitives/TldrawUiTooltip'

/** @public */
export interface ToggleToolLockedButtonProps {
	activeToolId?: string
}

/** @public @react */
export function ToggleToolLockedButton({ activeToolId }: ToggleToolLockedButtonProps) {
	const editor = useEditor()
	const breakpoint = useBreakpoint()
	const msg = useTranslation()
	const actions = useActions()

	const isToolLocked = useValue('is tool locked', () => editor.getInstanceState().isToolLocked, [
		editor,
	])
	const tool = useValue('current tool', () => editor.getCurrentTool(), [editor])

	if (!activeToolId || !tool.isLockable) return null

	const toggleLockAction = actions['toggle-tool-lock']
	const tooltipContent = toggleLockAction?.kbd
		? `${msg('action.toggle-tool-lock')} ${kbdStr(toggleLockAction.kbd)}`
		: msg('action.toggle-tool-lock')

	return (
		<TldrawUiTooltip content={tooltipContent}>
			<TldrawUiButton
				type="normal"
				data-testid="tool-lock"
				className={classNames('tlui-main-toolbar__lock-button', {
					'tlui-main-toolbar__lock-button__mobile': breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM,
				})}
				onClick={() => editor.updateInstanceState({ isToolLocked: !isToolLocked })}
			>
				<TldrawUiButtonIcon icon={isToolLocked ? 'lock' : 'unlock'} small />
			</TldrawUiButton>
		</TldrawUiTooltip>
	)
}
