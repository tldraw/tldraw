import { useIsMultiplayer } from '../../hooks/useIsMultiplayer'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuToolItem } from '../primitives/menus/TldrawUiMenuToolItem'

/** @public @react */
export function DefaultKeyboardShortcutsDialogContent() {
	const isMultiplayer = useIsMultiplayer()
	return (
		<>
			<TldrawUiMenuGroup label="shortcuts-dialog.tools" id="tools">
				<TldrawUiMenuActionItem action="toggle-tool-lock" />
				<TldrawUiMenuActionItem action="insert-media" />
				<TldrawUiMenuToolItem tool="select" />
				<TldrawUiMenuToolItem tool="draw" />
				<TldrawUiMenuToolItem tool="eraser" />
				<TldrawUiMenuToolItem tool="hand" />
				<TldrawUiMenuToolItem tool="rectangle" />
				<TldrawUiMenuToolItem tool="ellipse" />
				<TldrawUiMenuToolItem tool="arrow" />
				<TldrawUiMenuToolItem tool="line" />
				<TldrawUiMenuToolItem tool="text" />
				<TldrawUiMenuToolItem tool="frame" />
				<TldrawUiMenuToolItem tool="note" />
				<TldrawUiMenuToolItem tool="laser" />
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
				<TldrawUiMenuActionItem action="toggle-dark-mode" />
				<TldrawUiMenuActionItem action="toggle-focus-mode" />
				<TldrawUiMenuActionItem action="toggle-grid" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.edit" id="edit">
				<TldrawUiMenuActionItem action="undo" />
				<TldrawUiMenuActionItem action="redo" />
				<TldrawUiMenuActionItem action="cut" />
				<TldrawUiMenuActionItem action="copy" />
				<TldrawUiMenuActionItem action="paste" />
				<TldrawUiMenuActionItem action="select-all" />
				<TldrawUiMenuActionItem action="delete" />
				<TldrawUiMenuActionItem action="duplicate" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.view" id="view">
				<TldrawUiMenuActionItem action="zoom-in" />
				<TldrawUiMenuActionItem action="zoom-out" />
				<TldrawUiMenuActionItem action="zoom-to-100" />
				<TldrawUiMenuActionItem action="zoom-to-fit" />
				<TldrawUiMenuActionItem action="zoom-to-selection" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.transform" id="transform">
				<TldrawUiMenuActionItem action="bring-to-front" />
				<TldrawUiMenuActionItem action="bring-forward" />
				<TldrawUiMenuActionItem action="send-backward" />
				<TldrawUiMenuActionItem action="send-to-back" />
				<TldrawUiMenuActionItem action="group" />
				<TldrawUiMenuActionItem action="ungroup" />
				<TldrawUiMenuActionItem action="flip-horizontal" />
				<TldrawUiMenuActionItem action="flip-vertical" />
				<TldrawUiMenuActionItem action="align-top" />
				<TldrawUiMenuActionItem action="align-center-vertical" />
				<TldrawUiMenuActionItem action="align-bottom" />
				<TldrawUiMenuActionItem action="align-left" />
				<TldrawUiMenuActionItem action="align-center-horizontal" />
				<TldrawUiMenuActionItem action="align-right" />
			</TldrawUiMenuGroup>
			{isMultiplayer && (
				<TldrawUiMenuGroup label="shortcuts-dialog.collaboration" id="collaboration">
					<TldrawUiMenuActionItem action="open-cursor-chat" />
				</TldrawUiMenuGroup>
			)}
		</>
	)
}
