import { useEditor, useValue } from '@tldraw/editor'
import { showMenuPaste, useThreeStackableItems } from '../../../hooks/menuHelpers'
import { useActions } from '../../../hooks/useActions'
import { useAnySelectedShapesCount } from '../../../hooks/useAnySelectedShapesCount'
import { useOnlyFlippableShape } from '../../../hooks/useOnlyFlippableShape'
import { useUnlockedSelectedShapesCount } from '../../../hooks/useUnlockedSelectedShapesCount'
import { MoveToPageMenu as _MoveToPageMenu } from '../../MoveToPageMenu'
import {
	DuplicateMenuItem,
	EditLinkMenuItem,
	FitFrameToContentMenuItem,
	GroupMenuItem,
	RemoveFrameMenuItem,
	ToggleAutoSizeMenuItem,
	ToggleLockMenuItem,
	ToggleTransparentBgMenuItem,
	UngroupMenuItem,
} from '../MenuItems/MenuItems'
import { TldrawUiMenuGroup } from '../MenuItems/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../MenuItems/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../MenuItems/TldrawUiMenuSubmenu'

/** @public */
export function DefaultContextMenu() {
	const editor = useEditor()

	const selectToolActive = useValue(
		'isSelectToolActive',
		() => editor.getCurrentToolId() === 'select',
		[editor]
	)

	if (!selectToolActive) return null

	return (
		<>
			<SelectionMenuGroup />
			<ModifyMenuGroup />
			<ClipboardMenuGroup />
			<ConversionsMenuGroup />
			<SetSelectionGroup />
			<DeleteGroup />
		</>
	)
}

function SelectionMenuGroup() {
	return (
		<TldrawUiMenuGroup id="selection">
			<ToggleAutoSizeMenuItem />
			<EditLinkMenuItem />
			<DuplicateMenuItem />
			<GroupMenuItem />
			<UngroupMenuItem />
			<RemoveFrameMenuItem />
			<FitFrameToContentMenuItem />
			<ToggleLockMenuItem />
		</TldrawUiMenuGroup>
	)
}

function ModifyMenuGroup() {
	return (
		<TldrawUiMenuGroup id="modify">
			<ArrangeMenuSubmenu />
			<ReorderMenuSubmenu />
			<MoveToPageMenu />
		</TldrawUiMenuGroup>
	)
}

function ArrangeMenuSubmenu() {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const onlyFlippableShapeSelected = useOnlyFlippableShape()

	if (!(twoSelected || onlyFlippableShapeSelected)) return null

	return (
		<TldrawUiMenuSubmenu id="arrange" label="context-menu.arrange">
			<AlignMenuGroup />
			<DistributeMenuGroup />
			<StretchMenuGroup />
			<FlipMenuGroup />
			<OrderMenuGroup />
		</TldrawUiMenuSubmenu>
	)
}

function AlignMenuGroup() {
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)
	if (!twoSelected) return null

	return (
		<TldrawUiMenuGroup id="align">
			<TldrawUiMenuItem {...actions['align-left']} />
			<TldrawUiMenuItem {...actions['align-center-horizontal']} />
			<TldrawUiMenuItem {...actions['align-right']} />
			<TldrawUiMenuItem {...actions['align-top']} />
			<TldrawUiMenuItem {...actions['align-center-vertical']} />
			<TldrawUiMenuItem {...actions['align-bottom']} />
		</TldrawUiMenuGroup>
	)
}

function DistributeMenuGroup() {
	const actions = useActions()
	const threeSelected = useUnlockedSelectedShapesCount(3)
	if (!threeSelected) return null

	return (
		<TldrawUiMenuGroup id="distribute">
			<TldrawUiMenuItem {...actions['distribute-horizontal']} />
			<TldrawUiMenuItem {...actions['distribute-vertical']} />
		</TldrawUiMenuGroup>
	)
}

function StretchMenuGroup() {
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)
	if (!twoSelected) return null

	return (
		<TldrawUiMenuGroup id="stretch">
			<TldrawUiMenuItem {...actions['stretch-horizontal']} />
			<TldrawUiMenuItem {...actions['stretch-vertical']} />
		</TldrawUiMenuGroup>
	)
}

function FlipMenuGroup() {
	const actions = useActions()
	const onlyFlippableShapeSelected = useOnlyFlippableShape()
	if (!onlyFlippableShapeSelected) return null

	return (
		<TldrawUiMenuGroup id="flip">
			<TldrawUiMenuItem {...actions['flip-horizontal']} />
			<TldrawUiMenuItem {...actions['flip-vertical']} />
		</TldrawUiMenuGroup>
	)
}

function OrderMenuGroup() {
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const threeStackableItems = useThreeStackableItems()
	if (!twoSelected) return null

	return (
		<TldrawUiMenuGroup id="order">
			<TldrawUiMenuItem {...actions['pack']} />
			{threeStackableItems && <TldrawUiMenuItem {...actions['stack-horizontal']} />}
			{threeStackableItems && <TldrawUiMenuItem {...actions['stack-vertical']} />}
		</TldrawUiMenuGroup>
	)
}

function ReorderMenuSubmenu() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!oneSelected) return null

	return (
		<TldrawUiMenuSubmenu id="reorder" label="context-menu.reorder">
			<TldrawUiMenuGroup id="reorder">
				<TldrawUiMenuItem {...actions['bring-to-front']} />
				<TldrawUiMenuItem {...actions['bring-forward']} />
				<TldrawUiMenuItem {...actions['send-backward']} />
				<TldrawUiMenuItem {...actions['send-to-back']} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

function MoveToPageMenu() {
	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!oneSelected) return null
	return <_MoveToPageMenu />
}

/* -------------------- Clipboard ------------------- */

function ClipboardMenuGroup() {
	return (
		<TldrawUiMenuGroup id="clipboard">
			<CutMenuItem />
			<CopyMenuItem />
			<PasteMenuItem />
		</TldrawUiMenuGroup>
	)
}

function CutMenuItem() {
	const actions = useActions()
	const shouldDisplay = useUnlockedSelectedShapesCount(1)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['cut']} />
}

function CopyMenuItem() {
	const actions = useActions()
	const shouldDisplay = useAnySelectedShapesCount(1)
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['copy']} />
}

function PasteMenuItem() {
	const actions = useActions()
	const shouldDisplay = showMenuPaste
	if (!shouldDisplay) return null
	return <TldrawUiMenuItem {...actions['paste']} />
}

/* ------------------- Conversions ------------------ */

function ConversionsMenuGroup() {
	const editor = useEditor()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[]
	)
	if (!atLeastOneShapeOnPage) return null

	return (
		<TldrawUiMenuGroup id="conversions">
			<CopyAsMenuSubmenu />
			<ExportAsMenuSubmenu />
		</TldrawUiMenuGroup>
	)
}

// Copy as...

function CopyAsMenuSubmenu() {
	const actions = useActions()
	return (
		<TldrawUiMenuSubmenu id="copy-as" label="context-menu.copy-as">
			<TldrawUiMenuGroup id="copy-as-group">
				<TldrawUiMenuItem {...actions['copy-as-svg']} />
				{Boolean(window.navigator.clipboard?.write) && (
					<TldrawUiMenuItem {...actions['copy-as-png']} />
				)}
				<TldrawUiMenuItem {...actions['copy-as-json']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="copy-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

// Export as...

function ExportAsMenuSubmenu() {
	const actions = useActions()
	return (
		<TldrawUiMenuSubmenu id="export-as" label="context-menu.export-as">
			<TldrawUiMenuGroup id="export-as-group">
				<TldrawUiMenuItem {...actions['export-as-svg']} />
				<TldrawUiMenuItem {...actions['export-as-png']} />
				<TldrawUiMenuItem {...actions['export-as-json']} />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="export-as-bg">
				<ToggleTransparentBgMenuItem />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}

function SetSelectionGroup() {
	const actions = useActions()
	const editor = useEditor()
	const atLeastOneShapeOnPage = useValue(
		'atLeastOneShapeOnPage',
		() => editor.getCurrentPageShapeIds().size > 0,
		[editor]
	)
	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!atLeastOneShapeOnPage) return null
	return (
		<TldrawUiMenuGroup id="set-selection-group">
			<TldrawUiMenuItem {...actions['select-all']} />
			{oneSelected && <TldrawUiMenuItem {...actions['select-none']} />}
		</TldrawUiMenuGroup>
	)
}

function DeleteGroup() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	if (!oneSelected) return null
	return (
		<TldrawUiMenuGroup id="delete-group">
			<TldrawUiMenuItem {...actions['delete']} />
		</TldrawUiMenuGroup>
	)
}
