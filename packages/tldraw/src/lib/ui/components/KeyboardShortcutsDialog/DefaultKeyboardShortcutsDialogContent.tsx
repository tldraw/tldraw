import { useIsMultiplayer } from '../../hooks/useIsMultiplayer'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public @react */
export function DefaultKeyboardShortcutsDialogContent() {
	const isMultiplayer = useIsMultiplayer()
	return (
		<>
			<TldrawUiMenuGroup label="shortcuts-dialog.tools" id="tools">
				<TldrawUiMenuItem action="toggle-tool-lock" />
				<TldrawUiMenuItem action="insert-media" />
				<TldrawUiMenuItem tool="select" />
				<TldrawUiMenuItem tool="draw" />
				<TldrawUiMenuItem tool="eraser" />
				<TldrawUiMenuItem tool="hand" />
				<TldrawUiMenuItem tool="rectangle" />
				<TldrawUiMenuItem tool="ellipse" />
				<TldrawUiMenuItem tool="arrow" />
				<TldrawUiMenuItem tool="line" />
				<TldrawUiMenuItem tool="text" />
				<TldrawUiMenuItem tool="frame" />
				<TldrawUiMenuItem tool="note" />
				<TldrawUiMenuItem tool="laser" />
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
				<TldrawUiMenuItem action="toggle-dark-mode" />
				<TldrawUiMenuItem action="toggle-focus-mode" />
				<TldrawUiMenuItem action="toggle-grid" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.edit" id="edit">
				<TldrawUiMenuItem action="undo" />
				<TldrawUiMenuItem action="redo" />
				<TldrawUiMenuItem action="cut" />
				<TldrawUiMenuItem action="copy" />
				<TldrawUiMenuItem action="paste" />
				<TldrawUiMenuItem action="select-all" />
				<TldrawUiMenuItem action="delete" />
				<TldrawUiMenuItem action="duplicate" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.view" id="view">
				<TldrawUiMenuItem action="zoom-in" />
				<TldrawUiMenuItem action="zoom-out" />
				<TldrawUiMenuItem action="zoom-to-100" />
				<TldrawUiMenuItem action="zoom-to-fit" />
				<TldrawUiMenuItem action="zoom-to-selection" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.transform" id="transform">
				<TldrawUiMenuItem action="bring-to-front" />
				<TldrawUiMenuItem action="bring-forward" />
				<TldrawUiMenuItem action="send-backward" />
				<TldrawUiMenuItem action="send-to-back" />
				<TldrawUiMenuItem action="group" />
				<TldrawUiMenuItem action="ungroup" />
				<TldrawUiMenuItem action="flip-horizontal" />
				<TldrawUiMenuItem action="flip-vertical" />
				<TldrawUiMenuItem action="align-top" />
				<TldrawUiMenuItem action="align-center-vertical" />
				<TldrawUiMenuItem action="align-bottom" />
				<TldrawUiMenuItem action="align-left" />
				<TldrawUiMenuItem action="align-center-horizontal" />
				<TldrawUiMenuItem action="align-right" />
			</TldrawUiMenuGroup>
			{isMultiplayer && (
				<TldrawUiMenuGroup label="shortcuts-dialog.collaboration" id="collaboration">
					<TldrawUiMenuItem action="open-cursor-chat" />
				</TldrawUiMenuGroup>
			)}
		</>
	)
}
