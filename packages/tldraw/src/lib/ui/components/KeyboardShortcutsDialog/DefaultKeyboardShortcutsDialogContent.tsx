import { defineMessages, noop } from '@tldraw/editor'
import { useShowCollaborationUi } from '../../hooks/useCollaborationStatus'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuToolItem } from '../primitives/menus/TldrawUiMenuToolItem'

// The shortcut rows name actions from all over the UI, so only the ids nothing else declares
// are declared here — a second copy of an English string is a second thing to keep in step.
// `label` is data the menu primitives translate, so these reference the id rather than being `<F>`.
const messages = defineMessages({
	a11yEnterLeaveContainer: {
		id: 'a11y.enter-leave-container',
		defaultMessage: 'Enter/leave container',
	},
	a11yMoveShape: { id: 'a11y.move-shape', defaultMessage: 'Move shape' },
	a11yMoveShapeFaster: { id: 'a11y.move-shape-faster', defaultMessage: 'Move shape faster' },
	a11yOpenContextMenu: { id: 'a11y.open-context-menu', defaultMessage: 'Context menu…' },
	a11yOpenKeyboardShortcuts: {
		id: 'a11y.open-keyboard-shortcuts',
		defaultMessage: 'Keyboard shortcuts',
	},
	a11yPanCamera: { id: 'a11y.pan-camera', defaultMessage: 'Pan camera' },
	a11yRotateShapeCcw: {
		id: 'a11y.rotate-shape-ccw',
		defaultMessage: 'Rotate shape counterclockwise',
	},
	a11yRotateShapeCcwFine: {
		id: 'a11y.rotate-shape-ccw-fine',
		defaultMessage: 'Rotate shape counterclockwise (fine)',
	},
	a11yRotateShapeCw: { id: 'a11y.rotate-shape-cw', defaultMessage: 'Rotate shape clockwise' },
	a11yRotateShapeCwFine: {
		id: 'a11y.rotate-shape-cw-fine',
		defaultMessage: 'Rotate shape clockwise (fine)',
	},
	a11ySelectShape: { id: 'a11y.select-shape', defaultMessage: 'Select next shape' },
	a11ySelectShapeDirection: {
		id: 'a11y.select-shape-direction',
		defaultMessage: 'Select shape in direction',
	},
	actionZoomQuick: { id: 'action.zoom-quick', defaultMessage: 'Quick zoom' },
	shortcutsDialogA11y: { id: 'shortcuts-dialog.a11y', defaultMessage: 'Accessibility' },
	shortcutsDialogCollaboration: {
		id: 'shortcuts-dialog.collaboration',
		defaultMessage: 'Collaboration',
	},
	shortcutsDialogEdit: { id: 'shortcuts-dialog.edit', defaultMessage: 'Edit' },
	shortcutsDialogPreferences: { id: 'shortcuts-dialog.preferences', defaultMessage: 'Preferences' },
	shortcutsDialogTextFormatting: {
		id: 'shortcuts-dialog.text-formatting',
		defaultMessage: 'Text formatting',
	},
	shortcutsDialogTools: { id: 'shortcuts-dialog.tools', defaultMessage: 'Tools' },
	shortcutsDialogTransform: { id: 'shortcuts-dialog.transform', defaultMessage: 'Transform' },
	shortcutsDialogView: { id: 'shortcuts-dialog.view', defaultMessage: 'View' },
	toolPointerDown: { id: 'tool.pointer-down', defaultMessage: 'Pointer down' },
	toolRichTextHeader: { id: 'tool.rich-text-header', defaultMessage: 'Header' },
	toolRichTextStrikethrough: {
		id: 'tool.rich-text-strikethrough',
		defaultMessage: 'Strikethrough',
	},
})

/** @public @react */
export function DefaultKeyboardShortcutsDialogContent() {
	const showCollaborationUi = useShowCollaborationUi()
	return (
		<>
			<TldrawUiMenuGroup label={messages.shortcutsDialogTools.id} id="tools">
				<TldrawUiMenuActionItem actionId="toggle-tool-lock" />
				<TldrawUiMenuActionItem actionId="insert-media" />
				<TldrawUiMenuActionItem actionId="insert-embed" />
				<TldrawUiMenuToolItem toolId="select" />
				<TldrawUiMenuToolItem toolId="draw" />
				<TldrawUiMenuToolItem toolId="highlight" />
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
					label={messages.toolPointerDown.id}
					kbd=","
					onSelect={noop}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label={messages.shortcutsDialogPreferences.id} id="preferences">
				<TldrawUiMenuActionItem actionId="toggle-dark-mode" />
				<TldrawUiMenuActionItem actionId="toggle-focus-mode" />
				<TldrawUiMenuActionItem actionId="toggle-grid" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label={messages.shortcutsDialogEdit.id} id="edit">
				<TldrawUiMenuActionItem actionId="undo" />
				<TldrawUiMenuActionItem actionId="redo" />
				<TldrawUiMenuActionItem actionId="cut" />
				<TldrawUiMenuActionItem actionId="copy" />
				<TldrawUiMenuActionItem actionId="copy-as-png" />
				<TldrawUiMenuActionItem actionId="copy-hovered-styles" />
				<TldrawUiMenuActionItem actionId="paste" />
				<TldrawUiMenuActionItem actionId="select-all" />
				<TldrawUiMenuActionItem actionId="delete" />
				<TldrawUiMenuActionItem actionId="duplicate" />
				<TldrawUiMenuActionItem actionId="print" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label={messages.shortcutsDialogView.id} id="view">
				<TldrawUiMenuActionItem actionId="select-zoom-tool" />
				<TldrawUiMenuActionItem actionId="zoom-in" />
				<TldrawUiMenuActionItem actionId="zoom-out" />
				<TldrawUiMenuActionItem actionId="zoom-to-100" />
				<TldrawUiMenuActionItem actionId="zoom-to-fit" />
				<TldrawUiMenuActionItem actionId="zoom-to-selection" />
				<TldrawUiMenuItem
					id="zoom-quick"
					label={messages.actionZoomQuick.id}
					kbd="shift+z"
					onSelect={noop}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label={messages.shortcutsDialogTransform.id} id="transform">
				<TldrawUiMenuActionItem actionId="bring-to-front" />
				<TldrawUiMenuActionItem actionId="bring-forward" />
				<TldrawUiMenuActionItem actionId="send-backward" />
				<TldrawUiMenuActionItem actionId="send-to-back" />
				<TldrawUiMenuActionItem actionId="group" />
				<TldrawUiMenuActionItem actionId="ungroup" />
				<TldrawUiMenuActionItem actionId="frame-selection" />
				<TldrawUiMenuActionItem actionId="flatten-to-image" />
				<TldrawUiMenuActionItem actionId="toggle-lock" />
				<TldrawUiMenuActionItem actionId="flip-horizontal" />
				<TldrawUiMenuActionItem actionId="flip-vertical" />
				<TldrawUiMenuActionItem actionId="align-top" />
				<TldrawUiMenuActionItem actionId="align-center-vertical" />
				<TldrawUiMenuActionItem actionId="align-bottom" />
				<TldrawUiMenuActionItem actionId="align-left" />
				<TldrawUiMenuActionItem actionId="align-center-horizontal" />
				<TldrawUiMenuActionItem actionId="align-right" />
				<TldrawUiMenuActionItem actionId="distribute-horizontal" />
				<TldrawUiMenuActionItem actionId="distribute-vertical" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label={messages.shortcutsDialogTextFormatting.id} id="text">
				<TldrawUiMenuItem id="text-bold" label="tool.rich-text-bold" kbd="cmd+b" onSelect={noop} />
				<TldrawUiMenuItem
					id="text-italic"
					label="tool.rich-text-italic"
					kbd="cmd+i"
					onSelect={noop}
				/>
				<TldrawUiMenuItem id="text-code" label="tool.rich-text-code" kbd="cmd+e" onSelect={noop} />
				<TldrawUiMenuItem
					id="text-highlight"
					label="tool.rich-text-highlight"
					kbd="cmd+shift+h"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="text-strikethrough"
					label={messages.toolRichTextStrikethrough.id}
					kbd="cmd+shift+s"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="text-link"
					label="tool.rich-text-link"
					kbd="cmd+shift+k"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="text-header"
					label={messages.toolRichTextHeader.id}
					kbd="cmd+alt+[[1-6]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="text-orderedList"
					label="tool.rich-text-orderedList"
					kbd="cmd+shift+7"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="text-bulletedlist"
					label="tool.rich-text-bulletList"
					kbd="cmd+shift+8"
					onSelect={noop}
				/>
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup label={messages.shortcutsDialogA11y.id} id="a11y">
				<TldrawUiMenuItem
					id="a11y-select-next-shape"
					label={messages.a11ySelectShape.id}
					kbd="[[Tab]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-select-next-shape-direction"
					label={messages.a11ySelectShapeDirection.id}
					kbd="cmd+[[↑→↓←]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-select-next-shape-container"
					label={messages.a11yEnterLeaveContainer.id}
					kbd="cmd+shift+[[↑↓]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-pan-camera"
					label={messages.a11yPanCamera.id}
					kbd="[[Space]]+[[↑→↓←]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="adjust-shape-styles"
					label="a11y.adjust-shape-styles"
					kbd="cmd+[[Enter]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="open-context-menu"
					label={messages.a11yOpenContextMenu.id}
					kbd="cmd+shift+[[Enter]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-move-shape"
					label={messages.a11yMoveShape.id}
					kbd="[[↑→↓←]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-move-shape-faster"
					label={messages.a11yMoveShapeFaster.id}
					kbd="shift+[[↑→↓←]]"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-cw"
					label={messages.a11yRotateShapeCw.id}
					kbd="shift+﹥"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-cw-fine"
					label={messages.a11yRotateShapeCwFine.id}
					kbd="shift+alt+﹥"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-ccw"
					label={messages.a11yRotateShapeCcw.id}
					kbd="shift+﹤"
					onSelect={noop}
				/>
				<TldrawUiMenuItem
					id="a11y-rotate-shape-ccw-fine"
					label={messages.a11yRotateShapeCcwFine.id}
					kbd="shift+alt+﹤"
					onSelect={noop}
				/>
				<TldrawUiMenuActionItem actionId="enlarge-shapes" />
				<TldrawUiMenuActionItem actionId="shrink-shapes" />
				<TldrawUiMenuActionItem actionId="a11y-repeat-shape-announce" />
				<TldrawUiMenuItem
					id="a11y-open-keyboard-shortcuts"
					label={messages.a11yOpenKeyboardShortcuts.id}
					kbd="cmd+alt+/"
					onSelect={noop}
				/>
			</TldrawUiMenuGroup>
			{showCollaborationUi && (
				<TldrawUiMenuGroup label={messages.shortcutsDialogCollaboration.id} id="collaboration">
					<TldrawUiMenuActionItem actionId="open-cursor-chat" />
				</TldrawUiMenuGroup>
			)}
		</>
	)
}
