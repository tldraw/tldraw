/// <reference types="react" />

export { preloadFont } from './lib/utils/assets/preload-font'

export { useCanRedo, useCanUndo } from './lib/ui/hooks/menu-hooks'

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/editor'
export { Tldraw, type TldrawProps } from './lib/Tldraw'
export { TldrawImage, type TldrawImageProps } from './lib/TldrawImage'
export { TldrawHandles } from './lib/canvas/TldrawHandles'
export { TldrawScribble } from './lib/canvas/TldrawScribble'
export { TldrawSelectionBackground } from './lib/canvas/TldrawSelectionBackground'
export { TldrawSelectionForeground } from './lib/canvas/TldrawSelectionForeground'
export { defaultBindingUtils } from './lib/defaultBindingUtils'
export { defaultShapeTools } from './lib/defaultShapeTools'
export { defaultShapeUtils } from './lib/defaultShapeUtils'
export { defaultTools } from './lib/defaultTools'
export { ArrowShapeTool } from './lib/shapes/arrow/ArrowShapeTool'
export { ArrowShapeUtil } from './lib/shapes/arrow/ArrowShapeUtil'
export { type TLArcInfo, type TLArrowInfo, type TLArrowPoint } from './lib/shapes/arrow/arrow-types'
export {
	getArrowBindings,
	getArrowTerminalsInArrowSpace,
	type TLArrowBindings,
} from './lib/shapes/arrow/shared'
export { BookmarkShapeUtil } from './lib/shapes/bookmark/BookmarkShapeUtil'
export { DrawShapeTool } from './lib/shapes/draw/DrawShapeTool'
export { DrawShapeUtil } from './lib/shapes/draw/DrawShapeUtil'
export { EmbedShapeUtil } from './lib/shapes/embed/EmbedShapeUtil'
export { FrameShapeTool } from './lib/shapes/frame/FrameShapeTool'
export { FrameShapeUtil } from './lib/shapes/frame/FrameShapeUtil'
export { GeoShapeTool } from './lib/shapes/geo/GeoShapeTool'
export { GeoShapeUtil } from './lib/shapes/geo/GeoShapeUtil'
export { HighlightShapeTool } from './lib/shapes/highlight/HighlightShapeTool'
export { HighlightShapeUtil } from './lib/shapes/highlight/HighlightShapeUtil'
export { ImageShapeUtil } from './lib/shapes/image/ImageShapeUtil'
export { LineShapeTool } from './lib/shapes/line/LineShapeTool'
export { LineShapeUtil } from './lib/shapes/line/LineShapeUtil'
export { NoteShapeTool } from './lib/shapes/note/NoteShapeTool'
export { NoteShapeUtil } from './lib/shapes/note/NoteShapeUtil'
export { useDefaultColorTheme } from './lib/shapes/shared/ShapeFill'
export { TextLabel } from './lib/shapes/shared/TextLabel'
export { getPerfectDashProps } from './lib/shapes/shared/getPerfectDashProps'
export { TextShapeTool } from './lib/shapes/text/TextShapeTool'
export { TextShapeUtil } from './lib/shapes/text/TextShapeUtil'
export { VideoShapeUtil } from './lib/shapes/video/VideoShapeUtil'
export { EraserTool } from './lib/tools/EraserTool/EraserTool'
export { HandTool } from './lib/tools/HandTool/HandTool'
export { LaserTool } from './lib/tools/LaserTool/LaserTool'
export { SelectTool } from './lib/tools/SelectTool/SelectTool'
export { getOccludedChildren, kickoutOccludedShapes } from './lib/tools/SelectTool/selectHelpers'
export { ZoomTool } from './lib/tools/ZoomTool/ZoomTool'
// UI
export { useEditableText } from './lib/shapes/shared/useEditableText'
export { TldrawUi, type TldrawUiBaseProps, type TldrawUiProps } from './lib/ui/TldrawUi'
export { setDefaultUiAssetUrls, type TLUiAssetUrlOverrides } from './lib/ui/assetUrls'
export { OfflineIndicator } from './lib/ui/components/OfflineIndicator/OfflineIndicator'
export { Spinner } from './lib/ui/components/Spinner'
export { PORTRAIT_BREAKPOINT } from './lib/ui/constants'
export {
	TldrawUiContextProvider,
	type TldrawUiContextProviderProps,
} from './lib/ui/context/TldrawUiContextProvider'
export {
	useActions,
	type TLUiActionItem,
	type TLUiActionsContextType,
} from './lib/ui/context/actions'
export { AssetUrlsProvider, useAssetUrls } from './lib/ui/context/asset-urls'
export { BreakPointProvider, useBreakpoint } from './lib/ui/context/breakpoints'
export {
	useDialogs,
	type TLUiDialog,
	type TLUiDialogProps,
	type TLUiDialogsContextType,
} from './lib/ui/context/dialogs'
export {
	UiEventsProvider,
	useUiEvents,
	type EventsProviderProps,
	type TLUiEventContextType,
	type TLUiEventHandler,
	type TLUiEventMap,
	type TLUiEventSource,
} from './lib/ui/context/events'
export {
	useToasts,
	type AlertSeverity,
	type TLUiToast,
	type TLUiToastAction,
	type TLUiToastsContextType,
} from './lib/ui/context/toasts'
export { useMenuClipboardEvents, useNativeClipboardEvents } from './lib/ui/hooks/useClipboardEvents'
export { useCopyAs } from './lib/ui/hooks/useCopyAs'
export { useExportAs } from './lib/ui/hooks/useExportAs'
export { useKeyboardShortcuts } from './lib/ui/hooks/useKeyboardShortcuts'
export { useLocalStorageState } from './lib/ui/hooks/useLocalStorageState'
export { useMenuIsOpen } from './lib/ui/hooks/useMenuIsOpen'
export { usePreloadAssets } from './lib/ui/hooks/usePreloadAssets'
export { useReadonly } from './lib/ui/hooks/useReadonly'
export { useRelevantStyles } from './lib/ui/hooks/useRelevantStyles'
export {
	useTools,
	type TLUiToolItem,
	type TLUiToolsContextType,
	type TLUiToolsProviderProps,
} from './lib/ui/hooks/useTools'
export { type TLUiTranslationKey } from './lib/ui/hooks/useTranslation/TLUiTranslationKey'
export { type TLUiTranslation } from './lib/ui/hooks/useTranslation/translations'
export {
	useCurrentTranslation,
	useTranslation,
	type TLUiTranslationContextType,
} from './lib/ui/hooks/useTranslation/useTranslation'
export { type TLUiIconType } from './lib/ui/icon-types'
export { useDefaultHelpers, type TLUiOverrides } from './lib/ui/overrides'
export { containBoxSize, downsizeImage } from './lib/utils/assets/assets'
export { getEmbedInfo } from './lib/utils/embeds/embeds'
export { copyAs } from './lib/utils/export/copyAs'
export { exportToBlob, getSvgAsImage } from './lib/utils/export/export'
export { exportAs, type TLExportType } from './lib/utils/export/exportAs'
export { fitFrameToContent, removeFrame } from './lib/utils/frames/frames'
export {
	defaultEditorAssetUrls,
	setDefaultEditorAssetUrls,
} from './lib/utils/static-assets/assetUrls'
export { truncateStringWithEllipsis } from './lib/utils/text/text'
export {
	buildFromV1Document,
	type LegacyTldrawDocument,
} from './lib/utils/tldr/buildFromV1Document'
export {
	TLDRAW_FILE_EXTENSION,
	parseAndLoadDocument,
	parseTldrawJsonFile,
	serializeTldrawJson,
	serializeTldrawJsonBlob,
	type TldrawFile,
} from './lib/utils/tldr/file'

// Minimap default component
export { DefaultMinimap } from './lib/ui/components/Minimap/DefaultMinimap'

// Helper to unwrap label from action items
export { unwrapLabel } from './lib/ui/context/actions'

export {
	TldrawUiComponentsProvider,
	useTldrawUiComponents,
	type TLUiComponents,
	type TLUiComponentsProviderProps,
} from './lib/ui/context/components'

export { DefaultPageMenu } from './lib/ui/components/PageMenu/DefaultPageMenu'
export { PageItemInput } from './lib/ui/components/PageMenu/PageItemInput'
export { PageItemSubmenu } from './lib/ui/components/PageMenu/PageItemSubmenu'

export { DefaultNavigationPanel } from './lib/ui/components/NavigationPanel/DefaultNavigationPanel'

export {
	DefaultStylePanel,
	type TLUiStylePanelProps,
} from './lib/ui/components/StylePanel/DefaultStylePanel'
export {
	ArrowheadStylePickerSet,
	CommonStylePickerSet,
	DefaultStylePanelContent,
	GeoStylePickerSet,
	OpacitySlider,
	SplineStylePickerSet,
	TextStylePickerSet,
	type TLUiStylePanelContentProps,
} from './lib/ui/components/StylePanel/DefaultStylePanelContent'

export {
	DefaultActionsMenu,
	type TLUiActionsMenuProps,
} from './lib/ui/components/ActionsMenu/DefaultActionsMenu'
export {
	AlignMenuItems,
	DefaultActionsMenuContent,
	DistributeMenuItems,
	GroupOrUngroupMenuItem,
	ReorderMenuItems,
	RotateCWMenuItem,
	StackMenuItems,
	ZoomOrRotateMenuItem,
} from './lib/ui/components/ActionsMenu/DefaultActionsMenuContent'

export {
	DefaultContextMenu as ContextMenu,
	DefaultContextMenu,
	type TLUiContextMenuProps,
} from './lib/ui/components/ContextMenu/DefaultContextMenu'
export { DefaultContextMenuContent } from './lib/ui/components/ContextMenu/DefaultContextMenuContent'

export {
	DefaultHelpMenu,
	type TLUiHelpMenuProps,
} from './lib/ui/components/HelpMenu/DefaultHelpMenu'
export {
	DefaultHelpMenuContent,
	KeyboardShortcutsMenuItem,
} from './lib/ui/components/HelpMenu/DefaultHelpMenuContent'
export { LanguageMenu } from './lib/ui/components/LanguageMenu'

export {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	ConvertToBookmarkMenuItem,
	ConvertToEmbedMenuItem,
	CopyAsMenuGroup,
	CopyMenuItem,
	CutMenuItem,
	DeleteMenuItem,
	DuplicateMenuItem,
	EditLinkMenuItem,
	FitFrameToContentMenuItem,
	GroupMenuItem,
	MoveToPageMenu,
	PasteMenuItem,
	PrintItem,
	RemoveFrameMenuItem,
	ReorderMenuSubmenu,
	SelectAllMenuItem,
	ToggleAutoSizeMenuItem,
	ToggleDarkModeItem,
	ToggleDebugModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	ToggleLockMenuItem,
	ToggleReduceMotionItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleTransparentBgMenuItem,
	ToggleWrapModeItem,
	UngroupMenuItem,
	UnlockAllMenuItem,
	ZoomTo100MenuItem,
	ZoomToFitMenuItem,
	ZoomToSelectionMenuItem,
} from './lib/ui/components/menu-items'

export {
	DefaultMainMenu,
	type TLUiMainMenuProps,
} from './lib/ui/components/MainMenu/DefaultMainMenu'
export {
	DefaultMainMenuContent,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	MiscMenuGroup,
	PreferencesGroup,
	UndoRedoGroup,
	ViewSubmenu,
} from './lib/ui/components/MainMenu/DefaultMainMenuContent'

export {
	DefaultQuickActions,
	type TLUiQuickActionsProps,
} from './lib/ui/components/QuickActions/DefaultQuickActions'
export { DefaultQuickActionsContent } from './lib/ui/components/QuickActions/DefaultQuickActionsContent'

export {
	DefaultZoomMenu,
	type TLUiZoomMenuProps,
} from './lib/ui/components/ZoomMenu/DefaultZoomMenu'
export { DefaultZoomMenuContent } from './lib/ui/components/ZoomMenu/DefaultZoomMenuContent'

export {
	DefaultHelperButtons,
	type TLUiHelperButtonsProps,
} from './lib/ui/components/HelperButtons/DefaultHelperButtons'
export { DefaultHelperButtonsContent } from './lib/ui/components/HelperButtons/DefaultHelperButtonsContent'

export {
	DefaultKeyboardShortcutsDialog,
	type TLUiKeyboardShortcutsDialogProps,
} from './lib/ui/components/KeyboardShortcutsDialog/DefaultKeyboardShortcutsDialog'
export { DefaultKeyboardShortcutsDialogContent } from './lib/ui/components/KeyboardShortcutsDialog/DefaultKeyboardShortcutsDialogContent'

export {
	DefaultDebugMenu,
	type TLUiDebugMenuProps,
} from './lib/ui/components/DebugMenu/DefaultDebugMenu'
export {
	DebugFlags,
	DefaultDebugMenuContent,
	ExampleDialog,
	FeatureFlags,
} from './lib/ui/components/DebugMenu/DefaultDebugMenuContent'

export { type TLComponents } from './lib/Tldraw'

/* ------------------- Primitives ------------------- */

// Button
export {
	TldrawUiButton,
	type TLUiButtonProps,
} from './lib/ui/components/primitives/Button/TldrawUiButton'
export {
	TldrawUiButtonCheck,
	type TLUiButtonCheckProps,
} from './lib/ui/components/primitives/Button/TldrawUiButtonCheck'
export {
	TldrawUiButtonIcon,
	type TLUiButtonIconProps,
} from './lib/ui/components/primitives/Button/TldrawUiButtonIcon'
export {
	TldrawUiButtonLabel,
	type TLUiButtonLabelProps,
} from './lib/ui/components/primitives/Button/TldrawUiButtonLabel'

// Button picker
export {
	TldrawUiButtonPicker,
	type TLUiButtonPickerProps,
} from './lib/ui/components/primitives/TldrawUiButtonPicker'

// Dialog
export {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	type TLUiDialogBodyProps,
	type TLUiDialogFooterProps,
	type TLUiDialogHeaderProps,
	type TLUiDialogTitleProps,
} from './lib/ui/components/primitives/TldrawUiDialog'

// Dropdown Menu
export {
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuIndicator,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubTrigger,
	TldrawUiDropdownMenuTrigger,
	type TLUiDropdownMenuCheckboxItemProps,
	type TLUiDropdownMenuContentProps,
	type TLUiDropdownMenuGroupProps,
	type TLUiDropdownMenuItemProps,
	type TLUiDropdownMenuRootProps,
	type TLUiDropdownMenuSubProps,
	type TLUiDropdownMenuSubTriggerProps,
	type TLUiDropdownMenuTriggerProps,
} from './lib/ui/components/primitives/TldrawUiDropdownMenu'

// Icon
export { TldrawUiIcon, type TLUiIconProps } from './lib/ui/components/primitives/TldrawUiIcon'

// Input
export { TldrawUiInput, type TLUiInputProps } from './lib/ui/components/primitives/TldrawUiInput'

// Kbd
export { TldrawUiKbd, type TLUiKbdProps } from './lib/ui/components/primitives/TldrawUiKbd'

// Popover
export {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	type TLUiPopoverContentProps,
	type TLUiPopoverProps,
	type TLUiPopoverTriggerProps,
} from './lib/ui/components/primitives/TldrawUiPopover'

// Slider
export { TldrawUiSlider, type TLUiSliderProps } from './lib/ui/components/primitives/TldrawUiSlider'

// Toolbar
export { DefaultToolbar } from './lib/ui/components/Toolbar/DefaultToolbar'
export {
	ArrowDownToolbarItem,
	ArrowLeftToolbarItem,
	ArrowRightToolbarItem,
	ArrowToolbarItem,
	ArrowUpToolbarItem,
	AssetToolbarItem,
	CheckBoxToolbarItem,
	CloudToolbarItem,
	DefaultToolbarContent,
	DiamondToolbarItem,
	DrawToolbarItem,
	EllipseToolbarItem,
	EraserToolbarItem,
	FrameToolbarItem,
	HandToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	LineToolbarItem,
	NoteToolbarItem,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	SelectToolbarItem,
	StarToolbarItem,
	TextToolbarItem,
	TrapezoidToolbarItem,
	TriangleToolbarItem,
	XBoxToolbarItem,
	useIsToolSelected,
} from './lib/ui/components/Toolbar/DefaultToolbarContent'

/* ----------------- Menu Primitives ---------------- */

// General UI components for building menus
export {
	TldrawUiMenuCheckboxItem,
	type TLUiMenuCheckboxItemProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
export {
	TldrawUiMenuContextProvider,
	type TLUiMenuContextProviderProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuContext'
export {
	TldrawUiMenuGroup,
	type TLUiMenuGroupProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuGroup'
export {
	TldrawUiMenuItem,
	type TLUiMenuItemProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuItem'
export {
	TldrawUiMenuSubmenu,
	type TLUiMenuSubmenuProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuSubmenu'

/* ----------------- Constants ---------------- */

export {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	TEXT_PROPS,
} from './lib/shapes/shared/default-shape-constants'
