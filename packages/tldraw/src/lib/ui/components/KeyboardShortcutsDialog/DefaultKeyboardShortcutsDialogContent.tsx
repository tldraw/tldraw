import { useShowCollaborationUi } from '../../hooks/useIsMultiplayer'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuToolItem } from '../primitives/menus/TldrawUiMenuToolItem'

/** @public @react */
export function DefaultKeyboardShortcutsDialogContent() {
	const showCollaborationUi = useShowCollaborationUi()
	return (
		<>
			<TldrawUiMenuGroup label="shortcuts-dialog.tools" id="tools">
				<TldrawUiMenuActionItem actionId="toggle-tool-lock" />
				<TldrawUiMenuActionItem actionId="insert-media" />
				<TldrawUiMenuToolItem toolId="select" />
				<TldrawUiMenuToolItem toolId="draw" />
				<TldrawUiMenuToolItem toolId="eraser" />
				<TldrawUiMenuToolItem toolId="hand" />
				<TldrawUiMenuToolItem toolId="rectangle" />
				<TldrawUiMenuToolItem toolId="ellipse" />
				<TldrawUiMenuToolItem toolId="arrow" />
				<TldrawUiMenuToolItem toolId="line" />
				<TldrawUiMenuToolItem toolId="text" />
				<TldrawUiMenuToolItem toolId="frame" />
				<TldrawUiMenuToolItem toolId="note" />
				<TldrawUiMenuToolItem toolId="laser" />
				<TldrawUiMenuItem
					id="pointer-down"
					label="tool.pointer-down"
					kbd=","
					onSelect={() => {
						/* do nothing */
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.preferences" id="preferences">
				<TldrawUiMenuActionItem actionId="toggle-dark-mode" />
				<TldrawUiMenuActionItem actionId="toggle-focus-mode" />
				<TldrawUiMenuActionItem actionId="toggle-grid" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.edit" id="edit">
				<TldrawUiMenuActionItem actionId="undo" />
				<TldrawUiMenuActionItem actionId="redo" />
				<TldrawUiMenuActionItem actionId="cut" />
				<TldrawUiMenuActionItem actionId="copy" />
				<TldrawUiMenuActionItem actionId="paste" />
				<TldrawUiMenuActionItem actionId="select-all" />
				<TldrawUiMenuActionItem actionId="delete" />
				<TldrawUiMenuActionItem actionId="duplicate" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.view" id="view">
				<TldrawUiMenuActionItem actionId="zoom-in" />
				<TldrawUiMenuActionItem actionId="zoom-out" />
				<TldrawUiMenuActionItem actionId="zoom-to-100" />
				<TldrawUiMenuActionItem actionId="zoom-to-fit" />
				<TldrawUiMenuActionItem actionId="zoom-to-selection" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.transform" id="transform">
				<TldrawUiMenuActionItem actionId="bring-to-front" />
				<TldrawUiMenuActionItem actionId="bring-forward" />
				<TldrawUiMenuActionItem actionId="send-backward" />
				<TldrawUiMenuActionItem actionId="send-to-back" />
				<TldrawUiMenuActionItem actionId="group" />
				<TldrawUiMenuActionItem actionId="ungroup" />
				<TldrawUiMenuActionItem actionId="flip-horizontal" />
				<TldrawUiMenuActionItem actionId="flip-vertical" />
				<TldrawUiMenuActionItem actionId="align-top" />
				<TldrawUiMenuActionItem actionId="align-center-vertical" />
				<TldrawUiMenuActionItem actionId="align-bottom" />
				<TldrawUiMenuActionItem actionId="align-left" />
				<TldrawUiMenuActionItem actionId="align-center-horizontal" />
				<TldrawUiMenuActionItem actionId="align-right" />
			</TldrawUiMenuGroup>
			{showCollaborationUi && (
				<TldrawUiMenuGroup label="shortcuts-dialog.collaboration" id="collaboration">
					<TldrawUiMenuActionItem actionId="open-cursor-chat" />
				</TldrawUiMenuGroup>
			)}
		</>
	)
}
