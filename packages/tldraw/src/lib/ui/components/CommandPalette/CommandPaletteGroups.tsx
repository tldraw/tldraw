import { Editor, PageRecordType, TLShape, useEditor, useValue } from '@tldraw/editor'
import { ReactNode } from 'react'
import { getSelectedLinkShape } from '../../../utils/shapes/shapes'
import {
	hasThreeStackableShapes,
	isOnlyFlippableShapeSelected,
} from '../../context/action-predicates'
import { useUiEvents } from '../../context/events'
import {
	useAnySelectedShapesCount,
	useCanRedo,
	useCanUndo,
	useHasShapesOnPage,
	useUnlockedSelectedShapesCount,
} from '../../hooks/menu-hooks'
import { useReadonly } from '../../hooks/useReadonly'
import { useTools } from '../../hooks/useTools'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { ColorSchemeMenu } from '../ColorSchemeMenu'
import { ExitPenMode } from '../HelperButtons/ExitPenMode'
import { StopFollowing } from '../HelperButtons/StopFollowing'
import { KeyboardShortcutsMenuItem } from '../HelpMenu/DefaultHelpMenuContent'
import { InputModeMenu } from '../InputModeMenu'
import { LanguageMenu } from '../LanguageMenu'
import {
	ConvertToBookmarkMenuItem,
	ConvertToEmbedMenuItem,
	CopyMenuItem,
	CursorChatItem,
	CutMenuItem,
	DeleteMenuItem,
	DownloadOriginalMenuItem,
	DuplicateMenuItem,
	EditLinkMenuItem,
	FitFrameToContentMenuItem,
	FlattenMenuItem,
	FrameSelectionMenuItem,
	GroupMenuItem,
	MoveToPageMenu,
	RemoveFrameMenuItem,
	ToggleAutoSizeMenuItem,
	ToggleDebugModeItem,
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleEnhancedA11yModeItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	ToggleLockMenuItem,
	TogglePasteAtCursorItem,
	ToggleReduceMotionItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleTransparentBgMenuItem,
	ToggleWrapModeItem,
	UngroupMenuItem,
	ZoomToSelectionMenuItem,
} from '../menu-items'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'
import { TldrawUiMenuGroup } from '../primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from '../primitives/menus/TldrawUiMenuSubmenu'
import { TldrawUiMenuToolItem } from '../primitives/menus/TldrawUiMenuToolItem'

const PAGE_EMPTY = 'command-palette.reason.page-empty'

const SELECTION_REASONS = {
	1: 'command-palette.reason.select-shape',
	2: 'command-palette.reason.select-2-shapes',
	3: 'command-palette.reason.select-3-shapes',
} as const satisfies Record<number, TLUiTranslationKey>

// Selection-count gates show the item disabled with a reason, so a search still explains itself.
// Stricter gates stay with the wrapped item, which hides itself.
function WhenSelected({
	actionId,
	min = 1,
	includeLocked = false,
	wrapFallback,
	children,
}: {
	actionId: string
	min?: 1 | 2 | 3
	includeLocked?: boolean
	wrapFallback?(fallback: ReactNode): ReactNode
	children: ReactNode
}) {
	const unlocked = useUnlockedSelectedShapesCount(min)
	const any = useAnySelectedShapesCount(min)
	if (includeLocked ? any : unlocked) return <>{children}</>
	const fallback = (
		<TldrawUiMenuActionItem actionId={actionId} disabled disabledReason={SELECTION_REASONS[min]} />
	)
	return <>{wrapFallback ? wrapFallback(fallback) : fallback}</>
}

type SelectionKind = (editor: Editor, selected: TLShape[]) => boolean

const only =
	(type: TLShape['type']): SelectionKind =>
	(editor, selected) =>
		selected.length === 1 && selected[0].type === type

const SELECTION_KINDS = {
	frames: (editor, selected) =>
		selected.length > 0 && selected.every((shape) => editor.isShapeFrameLike(shape)),
	frame: (editor, selected) => selected.length === 1 && editor.isShapeFrameLike(selected[0]),
	group: (_editor, selected) => selected.some((shape) => shape.type === 'group'),
	text: only('text'),
	bookmark: only('bookmark'),
	embed: only('embed'),
	media: (_editor, selected) =>
		selected.some((shape) => shape.type === 'image' || shape.type === 'video'),
	link: (editor) => !!getSelectedLinkShape(editor),
} satisfies Record<string, SelectionKind>

const KIND_REASONS = {
	frames: 'command-palette.reason.select-frame',
	frame: 'command-palette.reason.select-frame',
	group: 'command-palette.reason.select-group',
	text: 'command-palette.reason.select-text',
	bookmark: 'command-palette.reason.select-bookmark',
	embed: 'command-palette.reason.select-embed',
	media: 'command-palette.reason.select-media',
	link: 'command-palette.reason.select-link-shape',
} as const satisfies Record<keyof typeof SELECTION_KINDS, TLUiTranslationKey>

// Kind gates: disabled with a reason until the right kind of shape is selected. The wrapped item
// still applies its own stricter checks, e.g. fit to content hides for an empty frame.
function WhenKindSelected({
	actionId,
	kind,
	children,
}: {
	actionId: string
	kind: keyof typeof SELECTION_KINDS
	children: ReactNode
}) {
	const editor = useEditor()
	const matches = useValue(
		'selection kind',
		() => SELECTION_KINDS[kind](editor, editor.getSelectedShapes()),
		[editor, kind]
	)
	if (matches) return <>{children}</>
	return <TldrawUiMenuActionItem actionId={actionId} disabled disabledReason={KIND_REASONS[kind]} />
}

/** @public @react */
export function CommandPaletteSelectionGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-selection" label="command-palette.selection">
			<WhenSelected actionId="delete">
				<DeleteMenuItem />
			</WhenSelected>
			<WhenSelected actionId="duplicate">
				<DuplicateMenuItem />
			</WhenSelected>
			<WhenSelected actionId="copy" includeLocked>
				<CopyMenuItem />
			</WhenSelected>
			<WhenSelected actionId="cut">
				<CutMenuItem />
			</WhenSelected>
			<WhenSelected actionId="toggle-lock" includeLocked>
				<ToggleLockMenuItem />
			</WhenSelected>
			<WhenSelected actionId="group" min={2}>
				<GroupMenuItem />
			</WhenSelected>
			<WhenKindSelected actionId="ungroup" kind="group">
				<UngroupMenuItem />
			</WhenKindSelected>
			<WhenSelected actionId="frame-selection" includeLocked>
				<FrameSelectionMenuItem />
			</WhenSelected>
			<WhenSelected actionId="flatten-to-image" includeLocked>
				<FlattenMenuItem />
			</WhenSelected>
			<WhenKindSelected actionId="remove-frame" kind="frames">
				<RemoveFrameMenuItem />
			</WhenKindSelected>
			<WhenKindSelected actionId="fit-frame-to-content" kind="frame">
				<FitFrameToContentMenuItem />
			</WhenKindSelected>
			<WhenKindSelected actionId="edit-link" kind="link">
				<EditLinkMenuItem />
			</WhenKindSelected>
			<WhenKindSelected actionId="convert-to-embed" kind="bookmark">
				<ConvertToEmbedMenuItem />
			</WhenKindSelected>
			<WhenKindSelected actionId="convert-to-bookmark" kind="embed">
				<ConvertToBookmarkMenuItem />
			</WhenKindSelected>
			<WhenKindSelected actionId="toggle-auto-size" kind="text">
				<ToggleAutoSizeMenuItem />
			</WhenKindSelected>
			<WhenKindSelected actionId="download-original" kind="media">
				<DownloadOriginalMenuItem />
			</WhenKindSelected>
			<WhenSelected actionId="select-none" includeLocked>
				<TldrawUiMenuActionItem actionId="select-none" />
			</WhenSelected>
			<WhenSelected actionId="zoom-to-selection" includeLocked>
				<ZoomToSelectionMenuItem />
			</WhenSelected>
		</TldrawUiMenuGroup>
	)
}

const REORDER_ACTIONS = [
	'bring-to-front',
	'bring-forward',
	'send-backward',
	'send-to-back',
] as const
const ROTATE_ACTIONS = ['rotate-cw', 'rotate-ccw'] as const
const ALIGN_ACTIONS = [
	'align-left',
	'align-center-horizontal',
	'align-right',
	'align-top',
	'align-center-vertical',
	'align-bottom',
	'stretch-horizontal',
	'stretch-vertical',
	'pack',
] as const
const DISTRIBUTE_ACTIONS = ['distribute-horizontal', 'distribute-vertical'] as const

function FlipItem({ actionId }: { actionId: 'flip-horizontal' | 'flip-vertical' }) {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const editor = useEditor()
	const onlyFlippableShape = useValue(
		'only flippable shape',
		() => isOnlyFlippableShapeSelected(editor),
		[editor]
	)
	if (!twoSelected && !onlyFlippableShape) {
		return (
			<TldrawUiMenuActionItem
				actionId={actionId}
				disabled
				disabledReason="command-palette.reason.cant-flip"
			/>
		)
	}
	return <TldrawUiMenuActionItem actionId={actionId} />
}

function StackItem({ actionId }: { actionId: 'stack-horizontal' | 'stack-vertical' }) {
	const editor = useEditor()
	const threeStackable = useValue('three stackable', () => hasThreeStackableShapes(editor), [
		editor,
	])
	// Connected arrows don't count, so 3 selected shapes can still fall short.
	if (!threeStackable) {
		return (
			<TldrawUiMenuActionItem
				actionId={actionId}
				disabled
				disabledReason="command-palette.reason.select-3-stackable"
			/>
		)
	}
	return <TldrawUiMenuActionItem actionId={actionId} />
}

/** @public @react */
export function CommandPaletteArrangeGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-arrange" label="context-menu.arrange">
			{[...REORDER_ACTIONS, ...ROTATE_ACTIONS].map((id) => (
				<WhenSelected key={id} actionId={id}>
					<TldrawUiMenuActionItem actionId={id} />
				</WhenSelected>
			))}
			{ALIGN_ACTIONS.map((id) => (
				<WhenSelected key={id} actionId={id} min={2}>
					<TldrawUiMenuActionItem actionId={id} />
				</WhenSelected>
			))}
			{DISTRIBUTE_ACTIONS.map((id) => (
				<WhenSelected key={id} actionId={id} min={3}>
					<TldrawUiMenuActionItem actionId={id} />
				</WhenSelected>
			))}
			<WhenSelected actionId="flip-horizontal">
				<FlipItem actionId="flip-horizontal" />
			</WhenSelected>
			<WhenSelected actionId="flip-vertical">
				<FlipItem actionId="flip-vertical" />
			</WhenSelected>
			<WhenSelected actionId="stack-horizontal" min={3}>
				<StackItem actionId="stack-horizontal" />
			</WhenSelected>
			<WhenSelected actionId="stack-vertical" min={3}>
				<StackItem actionId="stack-vertical" />
			</WhenSelected>
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPaletteEditGroup() {
	const canUndo = useCanUndo()
	const canRedo = useCanRedo()
	const hasShapes = useHasShapesOnPage()
	return (
		<TldrawUiMenuGroup id="command-palette-edit" label="menu.edit">
			<TldrawUiMenuActionItem
				actionId="undo"
				disabled={!canUndo}
				disabledReason="command-palette.reason.nothing-to-undo"
			/>
			<TldrawUiMenuActionItem
				actionId="redo"
				disabled={!canRedo}
				disabledReason="command-palette.reason.nothing-to-redo"
			/>
			<TldrawUiMenuActionItem actionId="paste" />
			<TldrawUiMenuActionItem
				actionId="select-all"
				disabled={!hasShapes}
				disabledReason={PAGE_EMPTY}
			/>
			<TldrawUiMenuActionItem actionId="insert-media" />
			<TldrawUiMenuActionItem actionId="insert-embed" />
			<TldrawUiMenuActionItem
				actionId="unlock-all"
				disabled={!hasShapes}
				disabledReason={PAGE_EMPTY}
			/>
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPaletteViewGroup() {
	const editor = useEditor()
	const hasShapes = useHasShapesOnPage()
	const isZoomedTo100 = useValue('zoomed to 100', () => editor.getEfficientZoomLevel() === 1, [
		editor,
	])
	const isContentOffscreen = useValue(
		'content offscreen',
		() => {
			const shapeIds = editor.getCurrentPageShapeIds()
			return shapeIds.size > 0 && shapeIds.size === editor.getNotVisibleShapes().size
		},
		[editor]
	)
	return (
		<TldrawUiMenuGroup id="command-palette-view" label="menu.view">
			<TldrawUiMenuActionItem actionId="zoom-in" />
			<TldrawUiMenuActionItem actionId="zoom-out" />
			{isContentOffscreen && <TldrawUiMenuActionItem actionId="back-to-content" />}
			<TldrawUiMenuActionItem
				actionId="zoom-to-fit"
				disabled={!hasShapes}
				disabledReason={PAGE_EMPTY}
			/>
			<TldrawUiMenuActionItem
				actionId="zoom-to-100"
				disabled={isZoomedTo100}
				disabledReason="command-palette.reason.zoom-100"
			/>
			<ToggleGridItem />
			<ToggleFocusModeItem />
			<ColorSchemeMenu />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPalettePagesGroup() {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()
	const isReadonly = useReadonly()
	const pages = useValue('pages', () => editor.getPages(), [editor])
	const currentPageId = useValue('current page id', () => editor.getCurrentPageId(), [editor])
	const { maxPages } = editor.options
	if (maxPages <= 1) return null

	return (
		<TldrawUiMenuGroup id="command-palette-pages" label="page-menu.title">
			<TldrawUiMenuSubmenu id="go-to-page" label="command-palette.go-to-page">
				{pages
					.filter((page) => page.id !== currentPageId)
					.map((page) => (
						<TldrawUiMenuItem
							key={page.id}
							id={`go-to-${page.id}`}
							label={page.name}
							readonlyOk
							onSelect={(source) => {
								editor.markHistoryStoppingPoint('change-page')
								editor.setCurrentPage(page.id)
								trackEvent('change-page', { source })
							}}
						/>
					))}
			</TldrawUiMenuSubmenu>
			{!isReadonly && (
				<TldrawUiMenuItem
					id="new-page"
					label="context.pages.new-page"
					disabled={pages.length >= maxPages}
					disabledReason="page-menu.max-pages-reached"
					onSelect={(source) => {
						const id = PageRecordType.createId()
						editor.run(() => {
							editor.markHistoryStoppingPoint('creating page')
							editor.createPage({ name: msg('page-menu.new-page-initial-name'), id })
							editor.setCurrentPage(id)
						})
						trackEvent('new-page', { source })
					}}
				/>
			)}
			{!isReadonly && (
				<WhenSelected
					actionId="move-to-new-page"
					wrapFallback={(fallback) => (
						<TldrawUiMenuSubmenu id="move-to-page" label="context-menu.move-to-page">
							{fallback}
						</TldrawUiMenuSubmenu>
					)}
				>
					<MoveToPageMenu />
				</WhenSelected>
			)}
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPaletteExportGroup() {
	const editor = useEditor()
	const hasShapes = useHasShapesOnPage()
	const isDebugMode = useValue('isDebugMode', () => editor.getInstanceState().isDebugMode, [editor])
	const canCopyPng = Boolean(editor.getContainerWindow().navigator.clipboard?.write)
	return (
		<TldrawUiMenuGroup id="command-palette-export" label="command-palette.export">
			<TldrawUiMenuActionItem
				actionId="export-as-svg"
				disabled={!hasShapes}
				disabledReason={PAGE_EMPTY}
			/>
			<TldrawUiMenuActionItem
				actionId="export-as-png"
				disabled={!hasShapes}
				disabledReason={PAGE_EMPTY}
			/>
			<TldrawUiMenuActionItem
				actionId="copy-as-svg"
				disabled={!hasShapes}
				disabledReason={PAGE_EMPTY}
			/>
			{canCopyPng && (
				<TldrawUiMenuActionItem
					actionId="copy-as-png"
					disabled={!hasShapes}
					disabledReason={PAGE_EMPTY}
				/>
			)}
			{isDebugMode && (
				<TldrawUiMenuActionItem
					actionId="copy-as-json"
					disabled={!hasShapes}
					disabledReason={PAGE_EMPTY}
				/>
			)}
			<ToggleTransparentBgMenuItem />
			<TldrawUiMenuActionItem actionId="print" disabled={!hasShapes} disabledReason={PAGE_EMPTY} />
		</TldrawUiMenuGroup>
	)
}

// Covered by the insert media and insert embed actions.
const EXCLUDED_TOOLS = new Set(['asset', 'embed'])

/** @public @react */
export function CommandPaletteToolsGroup() {
	const editor = useEditor()
	const tools = useTools()
	const currentToolId = useValue('current tool', () => editor.getCurrentToolId(), [editor])
	return (
		<TldrawUiMenuGroup id="command-palette-tools" label="command-palette.tools">
			{Object.values(tools)
				.filter((tool) => !EXCLUDED_TOOLS.has(tool.id) && tool.id !== currentToolId)
				.map((tool) => (
					<TldrawUiMenuToolItem key={tool.id} toolId={tool.id} />
				))}
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPalettePreferencesGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-preferences" label="menu.preferences">
			<ToggleSnapModeItem />
			<ToggleToolLockItem />
			<ToggleWrapModeItem />
			<ToggleEdgeScrollingItem />
			<ToggleDynamicSizeModeItem />
			<TogglePasteAtCursorItem />
			<ToggleDebugModeItem />
			{/* No keyboard shortcuts toggle: turning it off here would also turn off Cmd+K. */}
			<TldrawUiMenuSubmenu id="accessibility" label="menu.accessibility">
				<ToggleReduceMotionItem />
				<ToggleEnhancedA11yModeItem />
			</TldrawUiMenuSubmenu>
			<InputModeMenu />
			<LanguageMenu />
		</TldrawUiMenuGroup>
	)
}

/** @public @react */
export function CommandPaletteHelpGroup() {
	return (
		<TldrawUiMenuGroup id="command-palette-help" label="help-menu.title">
			<KeyboardShortcutsMenuItem />
			<CursorChatItem />
			<StopFollowing />
			<ExitPenMode />
		</TldrawUiMenuGroup>
	)
}
