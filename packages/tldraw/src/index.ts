/// <reference types="react" />

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/editor'
export { Tldraw, type TLComponents, type TldrawBaseProps, type TldrawProps } from './lib/Tldraw'
export { TldrawImage, type TldrawImageProps } from './lib/TldrawImage'
export { ArrowBindingUtil } from './lib/bindings/arrow/ArrowBindingUtil'
export { TldrawHandles } from './lib/canvas/TldrawHandles'
export { TldrawScribble } from './lib/canvas/TldrawScribble'
export { TldrawSelectionBackground } from './lib/canvas/TldrawSelectionBackground'
export { TldrawSelectionForeground } from './lib/canvas/TldrawSelectionForeground'
export { TldrawShapeIndicators } from './lib/canvas/TldrawShapeIndicators'
export { defaultBindingUtils } from './lib/defaultBindingUtils'
export {
	registerDefaultExternalContentHandlers,
	type TLExternalContentProps,
} from './lib/defaultExternalContentHandlers'
export { defaultShapeTools } from './lib/defaultShapeTools'
export { defaultShapeUtils } from './lib/defaultShapeUtils'
export { registerDefaultSideEffects } from './lib/defaultSideEffects'
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
export { TextLabel, type TextLabelProps } from './lib/shapes/shared/TextLabel'
export {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	TEXT_PROPS,
} from './lib/shapes/shared/default-shape-constants'
export { getPerfectDashProps } from './lib/shapes/shared/getPerfectDashProps'
export { useDefaultColorTheme } from './lib/shapes/shared/useDefaultColorTheme'
export { useEditableText } from './lib/shapes/shared/useEditableText'
export { TextShapeTool } from './lib/shapes/text/TextShapeTool'
export { TextShapeUtil } from './lib/shapes/text/TextShapeUtil'
export { VideoShapeUtil } from './lib/shapes/video/VideoShapeUtil'
export { type StyleValuesForUi } from './lib/styles'
export { EraserTool } from './lib/tools/EraserTool/EraserTool'
export { HandTool } from './lib/tools/HandTool/HandTool'
export { LaserTool } from './lib/tools/LaserTool/LaserTool'
export { SelectTool } from './lib/tools/SelectTool/SelectTool'
export { getOccludedChildren, kickoutOccludedShapes } from './lib/tools/SelectTool/selectHelpers'
export { ZoomTool } from './lib/tools/ZoomTool/ZoomTool'
export { TldrawUi, type TldrawUiProps } from './lib/ui/TldrawUi'
export {
	setDefaultUiAssetUrls,
	type TLUiAssetUrlOverrides,
	type TLUiAssetUrls,
} from './lib/ui/assetUrls'
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
	DefaultDebugMenu,
	type TLUiDebugMenuProps,
} from './lib/ui/components/DebugMenu/DefaultDebugMenu'
export {
	DebugFlags,
	DefaultDebugMenuContent,
	ExampleDialog,
	FeatureFlags,
	type ExampleDialogProps,
} from './lib/ui/components/DebugMenu/DefaultDebugMenuContent'
export { DefaultMenuPanel } from './lib/ui/components/DefaultMenuPanel'
export {
	DefaultHelpMenu,
	type TLUiHelpMenuProps,
} from './lib/ui/components/HelpMenu/DefaultHelpMenu'
export {
	DefaultHelpMenuContent,
	KeyboardShortcutsMenuItem,
} from './lib/ui/components/HelpMenu/DefaultHelpMenuContent'
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
export { LanguageMenu } from './lib/ui/components/LanguageMenu'
export {
	DefaultMainMenu,
	type TLUiMainMenuProps,
} from './lib/ui/components/MainMenu/DefaultMainMenu'
export {
	DefaultMainMenuContent,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	HelpGroup,
	MiscMenuGroup,
	PreferencesGroup,
	UndoRedoGroup,
	ViewSubmenu,
} from './lib/ui/components/MainMenu/DefaultMainMenuContent'
export { DefaultMinimap } from './lib/ui/components/Minimap/DefaultMinimap'
export { DefaultNavigationPanel } from './lib/ui/components/NavigationPanel/DefaultNavigationPanel'
export { OfflineIndicator } from './lib/ui/components/OfflineIndicator/OfflineIndicator'
export { DefaultPageMenu } from './lib/ui/components/PageMenu/DefaultPageMenu'
export { PageItemInput, type PageItemInputProps } from './lib/ui/components/PageMenu/PageItemInput'
export {
	PageItemSubmenu,
	type PageItemSubmenuProps,
} from './lib/ui/components/PageMenu/PageItemSubmenu'
export {
	DefaultQuickActions,
	type TLUiQuickActionsProps,
} from './lib/ui/components/QuickActions/DefaultQuickActions'
export { DefaultQuickActionsContent } from './lib/ui/components/QuickActions/DefaultQuickActionsContent'
export { DefaultSharePanel } from './lib/ui/components/SharePanel/DefaultSharePanel'
export { PeopleMenu, type PeopleMenuProps } from './lib/ui/components/SharePanel/PeopleMenu'
export { Spinner } from './lib/ui/components/Spinner'
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
	type StylePickerSetProps,
	type TLUiStylePanelContentProps,
	type ThemeStylePickerSetProps,
} from './lib/ui/components/StylePanel/DefaultStylePanelContent'
export {
	DefaultToolbar,
	type DefaultToolbarProps,
} from './lib/ui/components/Toolbar/DefaultToolbar'
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
	ToolbarItem,
	TrapezoidToolbarItem,
	TriangleToolbarItem,
	XBoxToolbarItem,
	useIsToolSelected,
	type ToolbarItemProps,
} from './lib/ui/components/Toolbar/DefaultToolbarContent'
export {
	CenteredTopPanelContainer,
	type CenteredTopPanelContainerProps,
} from './lib/ui/components/TopPanel/CenteredTopPanelContainer'
export { DefaultTopPanel } from './lib/ui/components/TopPanel/DefaultTopPanel'
export {
	DefaultZoomMenu,
	type TLUiZoomMenuProps,
} from './lib/ui/components/ZoomMenu/DefaultZoomMenu'
export { DefaultZoomMenuContent } from './lib/ui/components/ZoomMenu/DefaultZoomMenuContent'
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
export {
	TldrawUiButtonPicker,
	type TLUiButtonPickerProps,
} from './lib/ui/components/primitives/TldrawUiButtonPicker'
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
export { TldrawUiIcon, type TLUiIconProps } from './lib/ui/components/primitives/TldrawUiIcon'
export { TldrawUiInput, type TLUiInputProps } from './lib/ui/components/primitives/TldrawUiInput'
export { TldrawUiKbd, type TLUiKbdProps } from './lib/ui/components/primitives/TldrawUiKbd'
export {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	type TLUiPopoverContentProps,
	type TLUiPopoverProps,
	type TLUiPopoverTriggerProps,
} from './lib/ui/components/primitives/TldrawUiPopover'
export { TldrawUiSlider, type TLUiSliderProps } from './lib/ui/components/primitives/TldrawUiSlider'
export {
	TldrawUiMenuCheckboxItem,
	type TLUiMenuCheckboxItemProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
export {
	TldrawUiMenuContextProvider,
	type TLUiMenuContextProviderProps,
	type TldrawUiMenuContextType,
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
export { PORTRAIT_BREAKPOINT } from './lib/ui/constants'
export {
	TldrawUiContextProvider,
	type TldrawUiContextProviderProps,
} from './lib/ui/context/TldrawUiContextProvider'
export {
	unwrapLabel,
	useActions,
	type ActionsProviderProps,
	type TLUiActionItem,
	type TLUiActionsContextType,
} from './lib/ui/context/actions'
export { AssetUrlsProvider, useAssetUrls } from './lib/ui/context/asset-urls'
export {
	BreakPointProvider,
	useBreakpoint,
	type BreakPointProviderProps,
} from './lib/ui/context/breakpoints'
export {
	TldrawUiComponentsProvider,
	useTldrawUiComponents,
	type TLUiComponents,
	type TLUiComponentsProviderProps,
} from './lib/ui/context/components'
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
	type TLUiEventData,
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
export { useCanRedo, useCanUndo } from './lib/ui/hooks/menu-hooks'
export { useMenuClipboardEvents, useNativeClipboardEvents } from './lib/ui/hooks/useClipboardEvents'
export { useCopyAs } from './lib/ui/hooks/useCopyAs'
export { useExportAs } from './lib/ui/hooks/useExportAs'
export { useCollaborationStatus, useShowCollaborationUi } from './lib/ui/hooks/useIsMultiplayer'
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
	type TLUiTranslationProviderProps,
} from './lib/ui/hooks/useTranslation/useTranslation'
export { type TLUiIconType } from './lib/ui/icon-types'
export { useDefaultHelpers, type TLUiOverrideHelpers, type TLUiOverrides } from './lib/ui/overrides'
export { containBoxSize, downsizeImage, type BoxWidthHeight } from './lib/utils/assets/assets'
export { preloadFont, type TLTypeFace } from './lib/utils/assets/preload-font'
export { getEmbedInfo, type TLEmbedResult } from './lib/utils/embeds/embeds'
export { copyAs, type TLCopyType } from './lib/utils/export/copyAs'
export { exportToBlob, getSvgAsImage } from './lib/utils/export/export'
export { exportAs, type TLExportType } from './lib/utils/export/exportAs'
export { fitFrameToContent, removeFrame } from './lib/utils/frames/frames'
export {
	defaultEditorAssetUrls,
	setDefaultEditorAssetUrls,
	type TLEditorAssetUrls,
} from './lib/utils/static-assets/assetUrls'
export { truncateStringWithEllipsis } from './lib/utils/text/text'
export {
	TLV1AlignStyle,
	TLV1AssetType,
	TLV1ColorStyle,
	TLV1DashStyle,
	TLV1Decoration,
	TLV1FontStyle,
	TLV1ShapeType,
	TLV1SizeStyle,
	buildFromV1Document,
	type TLV1ArrowBinding,
	type TLV1ArrowShape,
	type TLV1Asset,
	type TLV1BaseAsset,
	type TLV1BaseBinding,
	type TLV1BaseShape,
	type TLV1Binding,
	type TLV1Bounds,
	type TLV1Document,
	type TLV1DrawShape,
	type TLV1EllipseShape,
	type TLV1GroupShape,
	type TLV1Handle,
	type TLV1ImageAsset,
	type TLV1ImageShape,
	type TLV1Page,
	type TLV1PageState,
	type TLV1RectangleShape,
	type TLV1Shape,
	type TLV1ShapeStyles,
	type TLV1StickyShape,
	type TLV1TextShape,
	type TLV1TriangleShape,
	type TLV1VideoAsset,
	type TLV1VideoShape,
} from './lib/utils/tldr/buildFromV1Document'
export {
	TLDRAW_FILE_EXTENSION,
	parseAndLoadDocument,
	parseTldrawJsonFile,
	serializeTldrawJson,
	serializeTldrawJsonBlob,
	type TldrawFile,
	type TldrawFileParseError,
} from './lib/utils/tldr/file'
