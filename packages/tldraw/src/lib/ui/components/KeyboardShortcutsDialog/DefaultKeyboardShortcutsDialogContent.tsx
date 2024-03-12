import { useActions } from '../../context/actions'
import { useTools } from '../../hooks/useTools'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public */
export function DefaultKeyboardShortcutsDialogContent() {
	const actions = useActions()
	const tools = useTools()
	return (
		<>
			<TldrawUiMenuGroup label="shortcuts-dialog.tools" id="tools">
				<TldrawUiMenuItem {...actions['toggle-tool-lock']} />
				<TldrawUiMenuItem {...actions['insert-media']} />
				<TldrawUiMenuItem {...tools['select']} />
				<TldrawUiMenuItem {...tools['draw']} />
				<TldrawUiMenuItem {...tools['eraser']} />
				<TldrawUiMenuItem {...tools['hand']} />
				<TldrawUiMenuItem {...tools['rectangle']} />
				<TldrawUiMenuItem {...tools['ellipse']} />
				<TldrawUiMenuItem {...tools['arrow']} />
				<TldrawUiMenuItem {...tools['line']} />
				<TldrawUiMenuItem {...tools['text']} />
				<TldrawUiMenuItem {...tools['frame']} />
				<TldrawUiMenuItem {...tools['note']} />
				<TldrawUiMenuItem {...tools['laser']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.preferences" id="preferences">
				<TldrawUiMenuItem {...actions['toggle-dark-mode']} />
				<TldrawUiMenuItem {...actions['toggle-focus-mode']} />
				<TldrawUiMenuItem {...actions['toggle-grid']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.edit" id="edit">
				<TldrawUiMenuItem {...actions['undo']} />
				<TldrawUiMenuItem {...actions['redo']} />
				<TldrawUiMenuItem {...actions['cut']} />
				<TldrawUiMenuItem {...actions['copy']} />
				<TldrawUiMenuItem {...actions['paste']} />
				<TldrawUiMenuItem {...actions['select-all']} />
				<TldrawUiMenuItem {...actions['delete']} />
				<TldrawUiMenuItem {...actions['duplicate']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.view" id="view">
				<TldrawUiMenuItem {...actions['zoom-in']} />
				<TldrawUiMenuItem {...actions['zoom-out']} />
				<TldrawUiMenuItem {...actions['zoom-to-100']} />
				<TldrawUiMenuItem {...actions['zoom-to-fit']} />
				<TldrawUiMenuItem {...actions['zoom-to-selection']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.transform" id="transform">
				<TldrawUiMenuItem {...actions['bring-to-front']} />
				<TldrawUiMenuItem {...actions['bring-forward']} />
				<TldrawUiMenuItem {...actions['send-backward']} />
				<TldrawUiMenuItem {...actions['send-to-back']} />
				<TldrawUiMenuItem {...actions['group']} />
				<TldrawUiMenuItem {...actions['ungroup']} />
				<TldrawUiMenuItem {...actions['flip-horizontal']} />
				<TldrawUiMenuItem {...actions['flip-vertical']} />
				<TldrawUiMenuItem {...actions['align-top']} />
				<TldrawUiMenuItem {...actions['align-center-vertical']} />
				<TldrawUiMenuItem {...actions['align-bottom']} />
				<TldrawUiMenuItem {...actions['align-left']} />
				<TldrawUiMenuItem {...actions['align-center-horizontal']} />
				<TldrawUiMenuItem {...actions['align-right']} />
			</TldrawUiMenuGroup>
		</>
	)
}
