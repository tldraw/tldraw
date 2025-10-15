/// <reference types="react" />

import { registerTldrawLibraryVersion } from '@tldraw/editor'
export {
	PathBuilder,
	PathBuilderGeometry2d,
	type BasePathBuilderOpts,
	type CubicBezierToPathBuilderCommand,
	type DashedPathBuilderOpts,
	type DrawPathBuilderDOpts,
	type DrawPathBuilderOpts,
	type LineToPathBuilderCommand,
	type MoveToPathBuilderCommand,
	type PathBuilderCommand,
	type PathBuilderCommandBase,
	type PathBuilderCommandInfo,
	type PathBuilderCommandOpts,
	type PathBuilderLineOpts,
	type PathBuilderOpts,
	type PathBuilderToDOpts,
	type SolidPathBuilderOpts,
} from './lib/shapes/shared/PathBuilder'
export { usePrefersReducedMotion } from './lib/shapes/shared/usePrefersReducedMotion'
export { DefaultA11yAnnouncer, useSelectedShapesAnnouncer } from './lib/ui/components/A11y'
export { AccessibilityMenu } from './lib/ui/components/AccessibilityMenu'
export { ColorSchemeMenu } from './lib/ui/components/ColorSchemeMenu'
export { DefaultFollowingIndicator } from './lib/ui/components/DefaultFollowingIndicator'
export { DefaultDialogs } from './lib/ui/components/Dialogs'
export {
	TldrawUiColumn,
	TldrawUiGrid,
	TldrawUiOrientationProvider,
	TldrawUiRow,
	useTldrawUiOrientation,
	type TldrawUiOrientationContext,
	type TldrawUiOrientationProviderProps,
	type TLUiLayoutProps,
} from './lib/ui/components/primitives/layout'
export {
	TldrawUiMenuActionCheckboxItem,
	type TLUiMenuActionCheckboxItemProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuActionCheckboxItem'
export {
	TldrawUiMenuActionItem,
	type TLUiMenuActionItemProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuActionItem'
export {
	TldrawUiMenuToolItem,
	type TLUiMenuToolItemProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuToolItem'
export { DefaultToasts } from './lib/ui/components/Toasts'
export { TldrawUiTranslationProvider } from './lib/ui/hooks/useTranslation/useTranslation'
// eslint-disable-next-line local/no-export-star
export * from '@tldraw/editor'
export { ArrowBindingUtil } from './lib/bindings/arrow/ArrowBindingUtil'
export { TldrawCropHandles, type TldrawCropHandlesProps } from './lib/canvas/TldrawCropHandles'
export { TldrawHandles } from './lib/canvas/TldrawHandles'
export { TldrawArrowHints, TldrawOverlays } from './lib/canvas/TldrawOverlays'
export { TldrawScribble } from './lib/canvas/TldrawScribble'
export { TldrawSelectionForeground } from './lib/canvas/TldrawSelectionForeground'
export { TldrawShapeIndicators } from './lib/canvas/TldrawShapeIndicators'
export { defaultBindingUtils } from './lib/defaultBindingUtils'
export {
	DEFAULT_EMBED_DEFINITIONS,
	embedShapePermissionDefaults,
	type CustomEmbedDefinition,
	type DefaultEmbedDefinitionType,
	type EmbedDefinition,
	type TLEmbedDefinition,
	type TLEmbedShapePermissions,
} from './lib/defaultEmbedDefinitions'
export {
	centerSelectionAroundPoint,
	createEmptyBookmarkShape,
	createShapesForAssets,
	DEFAULT_MAX_ASSET_SIZE,
	DEFAULT_MAX_IMAGE_DIMENSION,
	defaultHandleExternalEmbedContent,
	defaultHandleExternalExcalidrawContent,
	defaultHandleExternalFileAsset,
	defaultHandleExternalFileContent,
	defaultHandleExternalSvgTextContent,
	defaultHandleExternalTextContent,
	defaultHandleExternalTldrawContent,
	defaultHandleExternalUrlAsset,
	defaultHandleExternalUrlContent,
	getAssetInfo,
	getMediaAssetInfoPartial,
	notifyIfFileNotAllowed,
	registerDefaultExternalContentHandlers,
	type TLDefaultExternalContentHandlerOpts,
	type TLExternalContentProps,
} from './lib/defaultExternalContentHandlers'
export { defaultShapeTools } from './lib/defaultShapeTools'
export { defaultShapeUtils } from './lib/defaultShapeUtils'
export { registerDefaultSideEffects } from './lib/defaultSideEffects'
export { defaultTools } from './lib/defaultTools'
export {
	type ArrowShapeOptions,
	type TLArcArrowInfo,
	type TLArcInfo,
	type TLArrowInfo,
	type TLArrowPoint,
	type TLElbowArrowInfo,
	type TLStraightArrowInfo,
} from './lib/shapes/arrow/arrow-types'
export { ArrowShapeTool } from './lib/shapes/arrow/ArrowShapeTool'
export { ArrowShapeUtil } from './lib/shapes/arrow/ArrowShapeUtil'
export {
	clearArrowTargetState,
	getArrowTargetState,
	updateArrowTargetState,
	type ArrowTargetState,
	type UpdateArrowTargetStateOpts,
} from './lib/shapes/arrow/arrowTargetState'
export {
	type ElbowArrowBox,
	type ElbowArrowBoxEdges,
	type ElbowArrowBoxes,
	type ElbowArrowEdge,
	type ElbowArrowInfo,
	type ElbowArrowInfoWithoutRoute,
	type ElbowArrowMidpointHandle,
	type ElbowArrowOptions,
	type ElbowArrowRange,
	type ElbowArrowRoute,
	type ElbowArrowSide,
	type ElbowArrowSideReason,
	type ElbowArrowTargetBox,
} from './lib/shapes/arrow/elbow/definitions'
export {
	getArrowBindings,
	getArrowInfo,
	getArrowTerminalsInArrowSpace,
	type TLArrowBindings,
} from './lib/shapes/arrow/shared'
export { BookmarkShapeUtil } from './lib/shapes/bookmark/BookmarkShapeUtil'
export { DrawShapeTool } from './lib/shapes/draw/DrawShapeTool'
export { DrawShapeUtil, type DrawShapeOptions } from './lib/shapes/draw/DrawShapeUtil'
export { EmbedShapeUtil } from './lib/shapes/embed/EmbedShapeUtil'
export { FrameShapeTool } from './lib/shapes/frame/FrameShapeTool'
export { FrameShapeUtil, type FrameShapeOptions } from './lib/shapes/frame/FrameShapeUtil'
export { GeoShapeTool } from './lib/shapes/geo/GeoShapeTool'
export { GeoShapeUtil } from './lib/shapes/geo/GeoShapeUtil'
export { HighlightShapeTool } from './lib/shapes/highlight/HighlightShapeTool'
export {
	HighlightShapeUtil,
	type HighlightShapeOptions,
} from './lib/shapes/highlight/HighlightShapeUtil'
export { ImageShapeUtil } from './lib/shapes/image/ImageShapeUtil'
export { LineShapeTool } from './lib/shapes/line/LineShapeTool'
export { LineShapeUtil } from './lib/shapes/line/LineShapeUtil'
export { NoteShapeTool } from './lib/shapes/note/NoteShapeTool'
export { NoteShapeUtil, type NoteShapeOptions } from './lib/shapes/note/NoteShapeUtil'
export {
	ASPECT_RATIO_OPTIONS,
	ASPECT_RATIO_TO_VALUE,
	getCropBox,
	getDefaultCrop,
	getUncroppedSize,
	type ASPECT_RATIO_OPTION,
	type CropBoxOptions,
} from './lib/shapes/shared/crop'
export {
	ARROW_LABEL_FONT_SIZES,
	FONT_FAMILIES,
	FONT_SIZES,
	LABEL_FONT_SIZES,
	STROKE_SIZES,
	TEXT_PROPS,
} from './lib/shapes/shared/default-shape-constants'
export {
	allDefaultFontFaces,
	DefaultFontFaces,
	type TLDefaultFont,
	type TLDefaultFonts,
} from './lib/shapes/shared/defaultFonts'
export { getStrokePoints } from './lib/shapes/shared/freehand/getStrokePoints'
export { getSvgPathFromStrokePoints } from './lib/shapes/shared/freehand/svg'
export { type StrokeOptions, type StrokePoint } from './lib/shapes/shared/freehand/types'
export { PlainTextLabel, type PlainTextLabelProps } from './lib/shapes/shared/PlainTextLabel'
export {
	RichTextLabel,
	RichTextSVG,
	type RichTextLabelProps,
	type RichTextSVGProps,
} from './lib/shapes/shared/RichTextLabel'
export { useDefaultColorTheme } from './lib/shapes/shared/useDefaultColorTheme'
export { useEditablePlainText } from './lib/shapes/shared/useEditablePlainText'
export { useEditableRichText } from './lib/shapes/shared/useEditableRichText'
export {
	useImageOrVideoAsset,
	type UseImageOrVideoAssetOptions,
} from './lib/shapes/shared/useImageOrVideoAsset'
export { PlainTextArea } from './lib/shapes/text/PlainTextArea'
export { RichTextArea, type TextAreaProps } from './lib/shapes/text/RichTextArea'
export { TextShapeTool } from './lib/shapes/text/TextShapeTool'
export { TextShapeUtil, type TextShapeOptions } from './lib/shapes/text/TextShapeUtil'
export { VideoShapeUtil, type VideoShapeOptions } from './lib/shapes/video/VideoShapeUtil'
export { type StyleValuesForUi } from './lib/styles'
export { Tldraw, type TLComponents, type TldrawBaseProps, type TldrawProps } from './lib/Tldraw'
export { TldrawImage, type TldrawImageProps } from './lib/TldrawImage'
export { EraserTool } from './lib/tools/EraserTool/EraserTool'
export { HandTool } from './lib/tools/HandTool/HandTool'
export { LaserTool } from './lib/tools/LaserTool/LaserTool'
export { getHitShapeOnCanvasPointerDown } from './lib/tools/selection-logic/getHitShapeOnCanvasPointerDown'
export { SelectTool } from './lib/tools/SelectTool/SelectTool'
export { ZoomTool } from './lib/tools/ZoomTool/ZoomTool'
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
	DefaultHelperButtons,
	type TLUiHelperButtonsProps,
} from './lib/ui/components/HelperButtons/DefaultHelperButtons'
export { DefaultHelperButtonsContent } from './lib/ui/components/HelperButtons/DefaultHelperButtonsContent'
export {
	DefaultHelpMenu,
	type TLUiHelpMenuProps,
} from './lib/ui/components/HelpMenu/DefaultHelpMenu'
export {
	DefaultHelpMenuContent,
	KeyboardShortcutsMenuItem,
} from './lib/ui/components/HelpMenu/DefaultHelpMenuContent'
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
	LockGroup,
	MiscMenuGroup,
	PreferencesGroup,
	UndoRedoGroup,
	ViewSubmenu,
} from './lib/ui/components/MainMenu/DefaultMainMenuContent'
export {
	ArrangeMenuSubmenu,
	ClipboardMenuGroup,
	ConversionsMenuGroup,
	ConvertToBookmarkMenuItem,
	ConvertToEmbedMenuItem,
	CopyAsMenuGroup,
	CopyMenuItem,
	CursorChatItem,
	CutMenuItem,
	DeleteMenuItem,
	DuplicateMenuItem,
	EditLinkMenuItem,
	EditMenuSubmenu,
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
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleEnhancedA11yModeItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	ToggleKeyboardShortcutsItem,
	ToggleLockMenuItem,
	TogglePasteAtCursorItem,
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
export { DefaultMinimap } from './lib/ui/components/Minimap/DefaultMinimap'
export { MobileStylePanel } from './lib/ui/components/MobileStylePanel'
export { DefaultNavigationPanel } from './lib/ui/components/NavigationPanel/DefaultNavigationPanel'
export { OfflineIndicator } from './lib/ui/components/OfflineIndicator/OfflineIndicator'
export { DefaultPageMenu } from './lib/ui/components/PageMenu/DefaultPageMenu'
export { PageItemInput, type PageItemInputProps } from './lib/ui/components/PageMenu/PageItemInput'
export {
	PageItemSubmenu,
	type PageItemSubmenuProps,
} from './lib/ui/components/PageMenu/PageItemSubmenu'
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
	TldrawUiMenuCheckboxItem,
	type TLUiMenuCheckboxItemProps,
} from './lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
export {
	TldrawUiMenuContextProvider,
	type TLUiMenuContextProviderProps,
	type TLUiMenuContextType,
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
export {
	TldrawUiContextualToolbar,
	type TLUiContextualToolbarProps,
} from './lib/ui/components/primitives/TldrawUiContextualToolbar'
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
export {
	TldrawUiIcon,
	type TLUiIconJsx,
	type TLUiIconProps,
} from './lib/ui/components/primitives/TldrawUiIcon'
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
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	type TLUiToolbarButtonProps,
	type TLUiToolbarProps,
	type TLUiToolbarToggleGroupProps,
	type TLUiToolbarToggleItemProps,
} from './lib/ui/components/primitives/TldrawUiToolbar'
export {
	TldrawUiTooltip,
	TldrawUiTooltipProvider,
	type TldrawUiTooltipProps,
	type TldrawUiTooltipProviderProps,
} from './lib/ui/components/primitives/TldrawUiTooltip'
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
	DefaultStylePanelContent,
	StylePanelArrowheadPicker,
	StylePanelArrowKindPicker,
	StylePanelColorPicker,
	StylePanelDashPicker,
	StylePanelFillPicker,
	StylePanelFontPicker,
	StylePanelGeoShapePicker,
	StylePanelLabelAlignPicker,
	StylePanelOpacityPicker,
	StylePanelSection,
	StylePanelSizePicker,
	StylePanelSplinePicker,
	StylePanelTextAlignPicker,
	type StylePanelSectionProps,
} from './lib/ui/components/StylePanel/DefaultStylePanelContent'
export {
	StylePanelButtonPicker,
	StylePanelButtonPickerInline,
	type StylePanelButtonPickerProps,
} from './lib/ui/components/StylePanel/StylePanelButtonPicker'
export {
	StylePanelContextProvider,
	useStylePanelContext,
	type StylePanelContext,
	type StylePanelContextProviderProps,
} from './lib/ui/components/StylePanel/StylePanelContext'
export {
	StylePanelDoubleDropdownPicker,
	StylePanelDoubleDropdownPickerInline,
	type StylePanelDoubleDropdownPickerProps,
} from './lib/ui/components/StylePanel/StylePanelDoubleDropdownPicker'
export {
	StylePanelDropdownPicker,
	StylePanelDropdownPickerInline,
	type StylePanelDropdownPickerProps,
} from './lib/ui/components/StylePanel/StylePanelDropdownPicker'
export {
	StylePanelSubheading,
	type StylePanelSubheadingProps,
} from './lib/ui/components/StylePanel/StylePanelSubheading'
export {
	DefaultImageToolbar,
	type TLUiImageToolbarProps,
} from './lib/ui/components/Toolbar/DefaultImageToolbar'
export {
	DefaultImageToolbarContent,
	type DefaultImageToolbarContentProps,
} from './lib/ui/components/Toolbar/DefaultImageToolbarContent'
export {
	DefaultRichTextToolbar,
	type TLUiRichTextToolbarProps,
} from './lib/ui/components/Toolbar/DefaultRichTextToolbar'
export {
	DefaultRichTextToolbarContent,
	type DefaultRichTextToolbarContentProps,
} from './lib/ui/components/Toolbar/DefaultRichTextToolbarContent'
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
	HeartToolbarItem,
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
	useIsToolSelected,
	XBoxToolbarItem,
	type ToolbarItemProps,
} from './lib/ui/components/Toolbar/DefaultToolbarContent'
export {
	DefaultVideoToolbar,
	type TLUiVideoToolbarProps,
} from './lib/ui/components/Toolbar/DefaultVideoToolbar'
export {
	DefaultVideoToolbarContent,
	type DefaultVideoToolbarContentProps,
} from './lib/ui/components/Toolbar/DefaultVideoToolbarContent'
export {
	OverflowingToolbar,
	type OverflowingToolbarProps,
} from './lib/ui/components/Toolbar/OverflowingToolbar'
export {
	ToggleToolLockedButton,
	type ToggleToolLockedButtonProps,
} from './lib/ui/components/Toolbar/ToggleToolLockedButton'
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
export { PORTRAIT_BREAKPOINT } from './lib/ui/constants'
export {
	TldrawUiA11yProvider,
	useA11y,
	type A11yPriority,
	type A11yProviderProps,
	type TLUiA11y,
	type TLUiA11yContextType,
} from './lib/ui/context/a11y'
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
	TldrawUiDialogsProvider,
	useDialogs,
	type TLUiDialog,
	type TLUiDialogProps,
	type TLUiDialogsContextType,
	type TLUiDialogsProviderProps,
} from './lib/ui/context/dialogs'
export {
	TldrawUiEventsProvider,
	useUiEvents,
	type EventsProviderProps,
	type TLUiEventContextType,
	type TLUiEventData,
	type TLUiEventHandler,
	type TLUiEventMap,
	type TLUiEventSource,
} from './lib/ui/context/events'
export {
	TldrawUiContextProvider,
	type TLUiContextProviderProps,
} from './lib/ui/context/TldrawUiContextProvider'
export {
	TldrawUiToastsProvider,
	useToasts,
	type AlertSeverity,
	type TLUiToast,
	type TLUiToastAction,
	type TLUiToastsContextType,
	type TLUiToastsProviderProps,
} from './lib/ui/context/toasts'
export { useCanRedo, useCanUndo, useUnlockedSelectedShapesCount } from './lib/ui/hooks/menu-hooks'
export { useMenuClipboardEvents, useNativeClipboardEvents } from './lib/ui/hooks/useClipboardEvents'
export {
	useCollaborationStatus,
	useShowCollaborationUi,
} from './lib/ui/hooks/useCollaborationStatus'
export { useCopyAs } from './lib/ui/hooks/useCopyAs'
export { useExportAs } from './lib/ui/hooks/useExportAs'
export { useKeyboardShortcuts } from './lib/ui/hooks/useKeyboardShortcuts'
export { useLocalStorageState } from './lib/ui/hooks/useLocalStorageState'
export { useMenuIsOpen } from './lib/ui/hooks/useMenuIsOpen'
export { useReadonly } from './lib/ui/hooks/useReadonly'
export { useRelevantStyles } from './lib/ui/hooks/useRelevantStyles'
export {
	onDragFromToolbarToCreateShape,
	useTools,
	type OnDragFromToolbarToCreateShapesOpts,
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
export { TldrawUi, TldrawUiInFrontOfTheCanvas, type TldrawUiProps } from './lib/ui/TldrawUi'
export { containBoxSize, downsizeImage, type BoxWidthHeight } from './lib/utils/assets/assets'
export { preloadFont, type TLTypeFace } from './lib/utils/assets/preload-font'
export { getEmbedInfo, type TLEmbedResult } from './lib/utils/embeds/embeds'
export { putExcalidrawContent } from './lib/utils/excalidraw/putExcalidrawContent'
export { copyAs, type CopyAsOptions, type TLCopyType } from './lib/utils/export/copyAs'
export { downloadFile, exportAs, type ExportAsOptions } from './lib/utils/export/exportAs'
export { fitFrameToContent, removeFrame } from './lib/utils/frames/frames'
export {
	defaultEditorAssetUrls,
	setDefaultEditorAssetUrls,
	type TLEditorAssetUrls,
} from './lib/utils/static-assets/assetUrls'
export {
	defaultAddFontsFromNode,
	KeyboardShiftEnterTweakExtension,
	renderHtmlFromRichText,
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
	renderRichTextFromHTML,
	tipTapDefaultExtensions,
} from './lib/utils/text/richText'
export { truncateStringWithEllipsis } from './lib/utils/text/text'
export { TextDirection } from './lib/utils/text/textDirection'
export {
	buildFromV1Document,
	TLV1AlignStyle,
	TLV1AssetType,
	TLV1ColorStyle,
	TLV1DashStyle,
	TLV1Decoration,
	TLV1FontStyle,
	TLV1ShapeType,
	TLV1SizeStyle,
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
	parseAndLoadDocument,
	parseTldrawJsonFile,
	serializeTldrawJson,
	serializeTldrawJsonBlob,
	TLDRAW_FILE_EXTENSION,
	type TldrawFile,
	type TldrawFileParseError,
} from './lib/utils/tldr/file'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
