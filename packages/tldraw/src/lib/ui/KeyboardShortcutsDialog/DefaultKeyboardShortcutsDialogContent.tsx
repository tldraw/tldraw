import { TldrawUiMenuGroup } from '../components/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../components/menus/TldrawUiMenuItem'
import { useActions } from '../hooks/useActions'
import { useTools } from '../hooks/useTools'

/** @public */
export function DefaultKeyboardShortcutsDialogContent() {
	const actions = useActions()
	const tools = useTools()
	return (
		<>
			<TldrawUiMenuGroup id="shortcuts-dialog.tools">
				<TldrawUiMenuItem {...actions['toggle-tool-lock']} />
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
			<TldrawUiMenuGroup id="shortcuts-dialog.file">
				<TldrawUiMenuItem {...actions['insert-media']} />
				<TldrawUiMenuItem {...actions['print']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="shortcuts-dialog.preferences">
				<TldrawUiMenuItem {...actions['toggle-dark-mode']} />
				<TldrawUiMenuItem {...actions['toggle-focus-mode']} />
				<TldrawUiMenuItem {...actions['toggle-grid']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="shortcuts-dialog.edit">
				<TldrawUiMenuItem {...actions['undo']} />
				<TldrawUiMenuItem {...actions['redo']} />
				<TldrawUiMenuItem {...actions['cut']} />
				<TldrawUiMenuItem {...actions['copy']} />
				<TldrawUiMenuItem {...actions['paste']} />
				<TldrawUiMenuItem {...actions['select-all']} />
				<TldrawUiMenuItem {...actions['delete']} />
				<TldrawUiMenuItem {...actions['duplicate']} />
				<TldrawUiMenuItem {...actions['export-as-svg']} />
				<TldrawUiMenuItem {...actions['export-as-png']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="shortcuts-dialog.view">
				<TldrawUiMenuItem {...actions['zoom-in']} />
				<TldrawUiMenuItem {...actions['zoom-out']} />
				<TldrawUiMenuItem {...actions['zoom-to-100']} />
				<TldrawUiMenuItem {...actions['zoom-to-fit']} />
				<TldrawUiMenuItem {...actions['zoom-to-selection']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="shortcuts-dialog.transform">
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
