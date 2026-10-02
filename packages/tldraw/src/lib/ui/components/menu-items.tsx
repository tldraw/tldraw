import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../context/actions'
import { useUiEvents } from '../context/events'
import { useToasts } from '../context/toasts'
import {
	useAnySelectedShapesCount,
	useHasShapesOnPage,
	useUnlockedSelectedShapesCount,
} from '../hooks/menu-hooks'
import { useSomeActionsEnabled, useSomeActionsVisible } from '../hooks/useActionState'
import { useReadonly } from '../hooks/useReadonly'
import { TldrawUiMenuActionCheckboxItem } from './primitives/menus/TldrawUiMenuActionCheckboxItem'
import { TldrawUiMenuActionItem } from './primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from './primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

/* -------------------- Selection ------------------- */

/** @public @react */
export function ToggleAutoSizeMenuItem() {
	return <TldrawUiMenuActionItem actionId="toggle-auto-size" whenDisabled="hide" />
}

/** @public @react */
export function EditLinkMenuItem() {
	return <TldrawUiMenuActionItem actionId="edit-link" whenDisabled="hide" />
}

/** @public @react */
export function DuplicateMenuItem() {
	return <TldrawUiMenuActionItem actionId="duplicate" whenDisabled="hide" />
}

/** @public @react */
export function FlattenMenuItem() {
	return <TldrawUiMenuActionItem actionId="flatten-to-image" whenDisabled="hide" />
}

/** @public @react */
export function DownloadOriginalMenuItem() {
	return <TldrawUiMenuActionItem actionId="download-original" whenDisabled="hide" />
}

/** @public @react */
export function GroupMenuItem() {
	return <TldrawUiMenuActionItem actionId="group" whenDisabled="hide" />
}

/** @public @react */
export function UngroupMenuItem() {
	return <TldrawUiMenuActionItem actionId="ungroup" whenDisabled="hide" />
}

/** @public @react */
export function FrameSelectionMenuItem() {
	return <TldrawUiMenuActionItem actionId="frame-selection" whenDisabled="hide" />
}

/** @public @react */
export function RemoveFrameMenuItem() {
	return <TldrawUiMenuActionItem actionId="remove-frame" whenDisabled="hide" />
}

/** @public @react */
export function FitFrameToContentMenuItem() {
	return <TldrawUiMenuActionItem actionId="fit-frame-to-content" whenDisabled="hide" />
}

/** @public @react */
export function ToggleLockMenuItem() {
	return <TldrawUiMenuActionItem actionId="toggle-lock" whenDisabled="hide" />
}

/** @public @react */
export function ToggleTransparentBgMenuItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-transparent" toggle />
}

/** @public @react */
export function UnlockAllMenuItem() {
	return <TldrawUiMenuActionItem actionId="unlock-all" />
}

/* ---------------------- Zoom ---------------------- */

/** @public @react */
export function ZoomTo100MenuItem() {
	return <TldrawUiMenuActionItem actionId="zoom-to-100" noClose />
}

/** @public @react */
export function ZoomToFitMenuItem() {
	return (
		<TldrawUiMenuActionItem
			actionId="zoom-to-fit"
			data-testid="minimap.zoom-menu.zoom-to-fit"
			noClose
		/>
	)
}

/** @public @react */
export function ZoomToSelectionMenuItem() {
	return (
		<TldrawUiMenuActionItem
			actionId="zoom-to-selection"
			data-testid="minimap.zoom-menu.zoom-to-selection"
			noClose
		/>
	)
}

/* -------------------- Clipboard ------------------- */

/** @public @react */
export function ClipboardMenuGroup() {
	return (
		<TldrawUiMenuGroup id="clipboard">
			<CutMenuItem />
			<CopyMenuItem />
			<PasteMenuItem />
			<DuplicateMenuItem />
			<DeleteMenuItem />
		</TldrawUiMenuGroup>
	)
}

const COPY_AS_ACTIONS = ['copy-as-svg', 'copy-as-png', 'copy-as-json']

/** @public @react */
export function CopyAsMenuGroup() {
	const atLeastOneShapeOnPage = useHasShapesOnPage()
	const hasCopyActions = useSomeActionsVisible(COPY_AS_ACTIONS)
	if (!hasCopyActions) return null

	return (
		<TldrawUiMenuSubmenu
			id="copy-as"
			label="context-menu.copy-as"
			size="small"
			disabled={!atLeastOneShapeOnPage}
		>
			<TldrawUiMenuGroup id="copy-as-group">
				{COPY_AS_ACTIONS.map((id) => (
					<TldrawUiMenuActionItem key={id} actionId={id} />
				))}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="copy-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ExportAsMenuGroup() {
	const actions = useActions()

	// If a consumer has removed the export actions via `overrides`, don't render an empty submenu.
	if (!actions['export-as-svg'] && !actions['export-as-png']) return null

	return (
		<TldrawUiMenuSubmenu id="export-as" label="context-menu.export-as" size="small">
			<TldrawUiMenuGroup id="export-as-group">
				<TldrawUiMenuActionItem actionId="export-as-svg" />
				<TldrawUiMenuActionItem actionId="export-as-png" />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="export-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function CutMenuItem() {
	return <TldrawUiMenuActionItem actionId="cut" />
}

/** @public @react */
export function CopyMenuItem() {
	return <TldrawUiMenuActionItem actionId="copy" />
}

/** @public @react */
export function PasteMenuItem() {
	return <TldrawUiMenuActionItem actionId="paste" />
}

/* ------------------- Conversions ------------------ */

/** @public @react */
export function ConversionsMenuGroup() {
	const atLeastOneShapeOnPage = useHasShapesOnPage()

	if (!atLeastOneShapeOnPage) return null

	return (
		<TldrawUiMenuGroup id="conversions">
			<CopyAsMenuGroup />
			<ExportAsMenuGroup />
			<DownloadOriginalMenuItem />
		</TldrawUiMenuGroup>
	)
}

/* ------------------ Set Selection ----------------- */
/** @public @react */
export function SelectAllMenuItem() {
	return <TldrawUiMenuActionItem actionId="select-all" />
}

/* ------------------ Delete Group ------------------ */

/** @public @react */
export function DeleteMenuItem() {
	return <TldrawUiMenuActionItem actionId="delete" />
}

/* --------------------- Modify --------------------- */

/** @internal */
export const EDIT_ACTIONS = [
	'group',
	'ungroup',
	'flatten-to-image',
	'frame-selection',
	'edit-link',
	'fit-frame-to-content',
	'remove-frame',
	'convert-to-embed',
	'convert-to-bookmark',
	'toggle-auto-size',
	'toggle-lock',
]

/** @public @react */
export function EditMenuSubmenu() {
	// The selection check keeps an action replaced without isEnabled from opening the submenu on
	// an empty canvas.
	const hasSelection = useAnySelectedShapesCount(1)
	const show = useSomeActionsEnabled(EDIT_ACTIONS)
	if (!hasSelection || !show) return null

	return (
		<TldrawUiMenuSubmenu id="edit" label="context-menu.edit" size="small">
			{EDIT_ACTIONS.map((id) => (
				<TldrawUiMenuActionItem key={id} actionId={id} whenDisabled="hide" />
			))}
		</TldrawUiMenuSubmenu>
	)
}

const ARRANGE_GROUPS: { id: string; actionIds: string[] }[] = [
	{
		id: 'align',
		actionIds: [
			'align-left',
			'align-center-horizontal',
			'align-right',
			'align-top',
			'align-center-vertical',
			'align-bottom',
		],
	},
	{ id: 'distribute', actionIds: ['distribute-horizontal', 'distribute-vertical'] },
	{ id: 'stretch', actionIds: ['stretch-horizontal', 'stretch-vertical'] },
	{ id: 'flip', actionIds: ['flip-horizontal', 'flip-vertical'] },
	{ id: 'order', actionIds: ['pack', 'stack-horizontal', 'stack-vertical'] },
]
/** @internal */
export const ARRANGE_ACTIONS = ARRANGE_GROUPS.flatMap((group) => group.actionIds)

function ActionGroup({ id, actionIds }: { id: string; actionIds: string[] }) {
	const show = useSomeActionsEnabled(actionIds)
	if (!show) return null
	return (
		<TldrawUiMenuGroup id={id}>
			{actionIds.map((actionId) => (
				<TldrawUiMenuActionItem key={actionId} actionId={actionId} whenDisabled="hide" />
			))}
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function ArrangeMenuSubmenu() {
	const hasSelection = useUnlockedSelectedShapesCount(1)
	const show = useSomeActionsEnabled(ARRANGE_ACTIONS)
	if (!hasSelection || !show) return null

	return (
		<TldrawUiMenuSubmenu id="arrange" label="context-menu.arrange" size="small">
			{ARRANGE_GROUPS.map((group) => (
				<ActionGroup key={group.id} id={group.id} actionIds={group.actionIds} />
			))}
		</TldrawUiMenuSubmenu>
	)
}

/** @internal */
export const REORDER_ACTIONS = ['bring-to-front', 'bring-forward', 'send-backward', 'send-to-back']

/** @public @react */
export function ReorderMenuSubmenu() {
	const hasSelection = useUnlockedSelectedShapesCount(1)
	const show = useSomeActionsEnabled(REORDER_ACTIONS)
	if (!hasSelection || !show) return null

	return (
		<TldrawUiMenuSubmenu id="reorder" label="context-menu.reorder" size="small">
			<ActionGroup id="reorder" actionIds={REORDER_ACTIONS} />
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function MoveToPageMenu() {
	const editor = useEditor()
	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const { addToast } = useToasts()
	const trackEvent = useUiEvents()
	const isReadonlyMode = useReadonly()
	const oneSelected = useUnlockedSelectedShapesCount(1)

	if (!oneSelected) return null
	if (isReadonlyMode) return null

	return (
		<TldrawUiMenuSubmenu id="move-to-page" label="context-menu.move-to-page" size="small">
			<TldrawUiMenuGroup id="pages">
				{pages.map((page) => (
					<TldrawUiMenuItem
						id={page.id}
						key={page.id}
						disabled={currentPageId === page.id}
						label={page.name.length > 30 ? `${page.name.slice(0, 30)}…` : page.name}
						onSelect={(source) => {
							editor.markHistoryStoppingPoint('move_shapes_to_page')
							editor.moveShapesToPage(editor.getSelectedShapeIds(), page.id)

							const toPage = editor.getPage(page.id)

							if (toPage) {
								addToast({
									title: 'Changed page',
									description: `Moved to ${toPage.name}.`,
									actions: [
										{
											label: 'Go back',
											type: 'primary',
											onClick: () => {
												editor.markHistoryStoppingPoint('change-page')
												editor.setCurrentPage(currentPageId)
											},
										},
									],
								})
							}
							trackEvent('move-to-page', { source })
						}}
					/>
				))}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="new-page">
				<TldrawUiMenuActionItem actionId="move-to-new-page" />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

/** @public @react */
export function ConvertToBookmarkMenuItem() {
	return <TldrawUiMenuActionItem actionId="convert-to-bookmark" whenDisabled="hide" />
}

/** @public @react */
export function ConvertToEmbedMenuItem() {
	return <TldrawUiMenuActionItem actionId="convert-to-embed" whenDisabled="hide" />
}

/* ------------------- Preferences ------------------ */

/** @public @react */
export function ToggleSnapModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-snap-mode" />
}

/** @public @react */
export function ToggleToolLockItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-tool-lock" />
}

/** @public @react */
export function ToggleGridItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-grid" />
}

/** @public @react */
export function ToggleWrapModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-wrap-mode" />
}

/** @public @react */
export function ToggleDarkModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-dark-mode" />
}

/** @public @react */
export function ToggleFocusModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-focus-mode" />
}

/** @public @react */
export function ToggleEdgeScrollingItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-edge-scrolling" />
}

/** @public @react */
export function ToggleInvertZoomItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-invert-zoom" />
}

/** @public @react */
export function ToggleReduceMotionItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-reduce-motion" />
}

/** @public @react */
export function ToggleKeyboardShortcutsItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-keyboard-shortcuts" />
}

/** @public @react */
export function ToggleEnhancedA11yModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="enhanced-a11y-mode" />
}

/** @public @react */
export function ToggleDebugModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-debug-mode" />
}

/** @public @react */
export function ToggleDynamicSizeModeItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-dynamic-size-mode" />
}

/** @public @react */
export function TogglePasteAtCursorItem() {
	return <TldrawUiMenuActionCheckboxItem actionId="toggle-paste-at-cursor" />
}

/* ---------------------- Print --------------------- */

/** @public @react */
export function PrintItem() {
	return <TldrawUiMenuActionItem actionId="print" />
}

/* ---------------------- Multiplayer --------------------- */

/** @public @react */
export function CursorChatItem() {
	return <TldrawUiMenuActionItem actionId="open-cursor-chat" whenDisabled="hide" />
}
