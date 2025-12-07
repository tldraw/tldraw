import { useShowCollaborationUi } from '../../hooks/useCollaborationStatus'
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
			<TldrawUiMenuGroup label="shortcuts-dialog.text-formatting" id="text">
				<TldrawUiMenuItem
					id="text-bold"
					label="tool.rich-text-bold"
					kbd="cmd+b"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-italic"
					label="tool.rich-text-italic"
					kbd="cmd+i"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-code"
					label="tool.rich-text-code"
					kbd="cmd+e"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-highlight"
					label="tool.rich-text-highlight"
					kbd="cmd+shift+h"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-strikethrough"
					label="tool.rich-text-strikethrough"
					kbd="cmd+shift+s"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-link"
					label="tool.rich-text-link"
					kbd="cmd+shift+k"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-header"
					label="tool.rich-text-header"
					kbd="cmd+alt+[[1-6]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-orderedList"
					label="tool.rich-text-orderedList"
					kbd="cmd+shift+7"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="text-bulletedlist"
					label="tool.rich-text-bulletList"
					kbd="cmd+shift+8"
					onSelect={() => {
						/* do nothing */
					}}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label="shortcuts-dialog.a11y" id="a11y">
				<TldrawUiMenuItem
					id="a11y-select-next-shape"
					label="a11y.select-shape"
					kbd="[[Tab]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-select-next-shape-direction"
					label="a11y.select-shape-direction"
					kbd="cmd+[[↑→↓←]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-select-next-shape-container"
					label="a11y.enter-leave-container"
					kbd="cmd+shift+[[↑↓]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-pan-camera"
					label="a11y.pan-camera"
					kbd="[[Space]]+[[↑→↓←]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="adjust-shape-styles"
					label="a11y.adjust-shape-styles"
					kbd="cmd+[[Enter]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="open-context-menu"
					label="a11y.open-context-menu"
					kbd="cmd+shift+[[Enter]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-move-shape"
					label="a11y.move-shape"
					kbd="[[↑→↓←]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-move-shape-faster"
					label="a11y.move-shape-faster"
					kbd="shift+[[↑→↓←]]"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-cw"
					label="a11y.rotate-shape-cw"
					kbd="shift+﹥"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-cw-fine"
					label="a11y.rotate-shape-cw-fine"
					kbd="shift+alt+﹥"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-ccw"
					label="a11y.rotate-shape-ccw"
					kbd="shift+﹤"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-ccw-fine"
					label="a11y.rotate-shape-ccw-fine"
					kbd="shift+alt+﹤"
					onSelect={() => {
						/* do nothing */
					}}
				/>
				<TldrawUiMenuActionItem actionId="enlarge-shapes" />
				<TldrawUiMenuActionItem actionId="shrink-shapes" />
				<TldrawUiMenuActionItem actionId="a11y-repeat-shape-announce" />
				<TldrawUiMenuItem
					id="a11y-open-keyboard-shortcuts"
					label="a11y.open-keyboard-shortcuts"
					kbd="cmd+alt+/"
					onSelect={() => {
						/* do nothing */
					}}
				/>
			</TldrawUiMenuGroup>
			{showCollaborationUi && (
				<TldrawUiMenuGroup label="shortcuts-dialog.collaboration" id="collaboration">
					<TldrawUiMenuActionItem actionId="open-cursor-chat" />
				</TldrawUiMenuGroup>
			)}
		</>
	)
}
