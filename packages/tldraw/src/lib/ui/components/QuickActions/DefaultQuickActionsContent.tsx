import { MoonIcon, SunIcon } from '@heroicons/react/24/solid'
import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../context/actions'
import {
	useCanRedo,
	useCanUndo,
	useIsInSelectState,
	useUnlockedSelectedShapesCount,
} from '../../hooks/menu-hooks'
import { useReadonly } from '../../hooks/useReadonly'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

/** @public @react */
export function DefaultQuickActionsContent() {
	const editor = useEditor()

	const isReadonlyMode = useReadonly()

	const isInAcceptableReadonlyState = useValue(
		'should display quick actions',
		() => editor.isInAny('select', 'hand', 'zoom'),
		[editor]
	)

	if (isReadonlyMode && !isInAcceptableReadonlyState) return

	return (
		<>
			<UndoRedoGroup />
			<DeleteDuplicateGroup />
			<ThemeToggleGroup />
		</>
	)
}

function DeleteDuplicateGroup() {
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const selectDependentActionsEnabled = oneSelected && isInSelectState
	return (
		<>
			<TldrawUiMenuActionItem actionId="delete" disabled={!selectDependentActionsEnabled} />
			<TldrawUiMenuActionItem actionId="duplicate" disabled={!selectDependentActionsEnabled} />
		</>
	)
}

function UndoRedoGroup() {
	const canUndo = useCanUndo()
	const canRedo = useCanRedo()
	return (
		<>
			<TldrawUiMenuActionItem actionId="undo" disabled={!canUndo} />
			<TldrawUiMenuActionItem actionId="redo" disabled={!canRedo} />
		</>
	)
}

function ThemeToggleGroup() {
	const editor = useEditor()
	const isDarkMode = useValue('isDarkMode', () => editor.user.getIsDarkMode(), [editor])
	const actions = useActions()
	const toggleDarkModeAction = actions['toggle-dark-mode']

	return (
		<TldrawUiButton
			type="icon"
			title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
			onClick={() => toggleDarkModeAction?.onSelect('quick-actions')}
			data-testid="quick-actions.toggle-dark-mode"
		>
			{isDarkMode ? (
				<MoonIcon style={{ width: '18px', height: '18px' }} />
			) : (
				<SunIcon style={{ width: '18px', height: '18px' }} />
			)}
		</TldrawUiButton>
	)
}
