/// <reference types="react" />

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/editor'
export { Tldraw, type TldrawProps } from './lib/Tldraw'
export { TldrawCropHandles, type TldrawCropHandlesProps } from './lib/canvas/TldrawCropHandles'
export { TldrawHandles } from './lib/canvas/TldrawHandles'
export { TldrawHoveredShapeIndicator } from './lib/canvas/TldrawHoveredShapeIndicator'
export { TldrawScribble } from './lib/canvas/TldrawScribble'
export { TldrawSelectionBackground } from './lib/canvas/TldrawSelectionBackground'
export { TldrawSelectionForeground } from './lib/canvas/TldrawSelectionForeground'
export { defaultShapeTools } from './lib/defaultShapeTools'
export { defaultShapeUtils } from './lib/defaultShapeUtils'
export { defaultTools } from './lib/defaultTools'
export { ArrowShapeTool } from './lib/shapes/arrow/ArrowShapeTool'
export { ArrowShapeUtil } from './lib/shapes/arrow/ArrowShapeUtil'
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
export { TextShapeTool } from './lib/shapes/text/TextShapeTool'
export { TextShapeUtil } from './lib/shapes/text/TextShapeUtil'
export { VideoShapeUtil } from './lib/shapes/video/VideoShapeUtil'
export { EraserTool } from './lib/tools/EraserTool/EraserTool'
export { HandTool } from './lib/tools/HandTool/HandTool'
export { LaserTool } from './lib/tools/LaserTool/LaserTool'
export { SelectTool } from './lib/tools/SelectTool/SelectTool'
export { ZoomTool } from './lib/tools/ZoomTool/ZoomTool'
// UI
export { TldrawUi, type TldrawUiBaseProps, type TldrawUiProps } from './lib/ui/TldrawUi'
export {
	TldrawUiContextProvider,
	type TldrawUiContextProviderProps,
} from './lib/ui/TldrawUiContextProvider'
export { setDefaultUiAssetUrls, type TLUiAssetUrlOverrides } from './lib/ui/assetUrls'
export { OfflineIndicator } from './lib/ui/components/OfflineIndicator/OfflineIndicator'
export { Spinner } from './lib/ui/components/Spinner'
export {
	DefaultContextMenu as ContextMenu,
	type TLUiContextMenuProps,
} from './lib/ui/components/menus/ContextMenu/DefaultContextMenu'
export { Button, type TLUiButtonProps } from './lib/ui/components/primitives/Button'
export { Icon, type TLUiIconProps } from './lib/ui/components/primitives/Icon'
export { Input, type TLUiInputProps } from './lib/ui/components/primitives/Input'
export {
	compactMenuItems,
	findMenuItem,
	menuCustom,
	menuGroup,
	menuItem,
	menuSubmenu,
	type TLUiCustomMenuItem,
	type TLUiMenuChild,
	type TLUiMenuGroup,
	type TLUiMenuItem,
	type TLUiMenuSchema,
	type TLUiSubMenu,
} from './lib/ui/hooks/menuHelpers'
export {
	useActions,
	type TLUiActionItem,
	type TLUiActionsContextType,
} from './lib/ui/hooks/useActions'
export { AssetUrlsProvider, useAssetUrls } from './lib/ui/hooks/useAssetUrls'
export { BreakPointProvider, useBreakpoint } from './lib/ui/hooks/useBreakpoint'
export { useCanRedo } from './lib/ui/hooks/useCanRedo'
export { useCanUndo } from './lib/ui/hooks/useCanUndo'
export { useMenuClipboardEvents, useNativeClipboardEvents } from './lib/ui/hooks/useClipboardEvents'

export { useCopyAs } from './lib/ui/hooks/useCopyAs'
export {
	useDialogs,
	type TLUiDialog,
	type TLUiDialogProps,
	type TLUiDialogsContextType,
} from './lib/ui/hooks/useDialogsProvider'
export {
	UiEventsProvider,
	useUiEvents,
	type EventsProviderProps,
	type TLUiEventContextType,
	type TLUiEventHandler,
	type TLUiEventMap,
	type TLUiEventSource,
} from './lib/ui/hooks/useEventsProvider'
export { useExportAs } from './lib/ui/hooks/useExportAs'
export { useKeyboardShortcuts } from './lib/ui/hooks/useKeyboardShortcuts'
export {
	useKeyboardShortcutsSchema,
	type TLUiKeyboardShortcutsSchemaContextType,
	type TLUiKeyboardShortcutsSchemaProviderProps,
} from './lib/ui/hooks/useKeyboardShortcutsSchema'
export { useLocalStorageState } from './lib/ui/hooks/useLocalStorageState'
export { useMenuIsOpen } from './lib/ui/hooks/useMenuIsOpen'
export { useReadonly } from './lib/ui/hooks/useReadonly'
export {
	useToasts,
	type TLUiToast,
	type TLUiToastAction,
	type TLUiToastsContextType,
} from './lib/ui/hooks/useToastsProvider'
export {
	toolbarItem,
	useToolbarSchema,
	type TLUiToolbarItem,
	type TLUiToolbarSchemaContextType,
} from './lib/ui/hooks/useToolbarSchema'
export {
	useTools,
	type TLUiToolItem,
	type TLUiToolsContextType,
	type TLUiToolsProviderProps,
} from './lib/ui/hooks/useTools'
export { type TLUiTranslationKey } from './lib/ui/hooks/useTranslation/TLUiTranslationKey'
export { type TLUiTranslation } from './lib/ui/hooks/useTranslation/translations'
export {
	useTranslation as useTranslation,
	type TLUiTranslationContextType,
} from './lib/ui/hooks/useTranslation/useTranslation'
export { type TLUiIconType } from './lib/ui/icon-types'
export { useDefaultHelpers, type TLUiOverrides } from './lib/ui/overrides'
export {
	DEFAULT_ACCEPTED_IMG_TYPE,
	DEFAULT_ACCEPTED_VID_TYPE,
	containBoxSize,
	downsizeImage,
	isGifAnimated,
} from './lib/utils/assets/assets'
export { getEmbedInfo } from './lib/utils/embeds/embeds'
export { copyAs } from './lib/utils/export/copyAs'
export { getSvgAsImage } from './lib/utils/export/export'
export { exportAs } from './lib/utils/export/exportAs'
export { fitFrameToContent, removeFrame } from './lib/utils/frames/frames'
export { setDefaultEditorAssetUrls } from './lib/utils/static-assets/assetUrls'
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

// Main menu default component
export { DefaultMainMenuContent } from './lib/ui/components/menus/MainMenu/DefaultMainMenuContent'

// Context menu default component
export { DefaultContextMenuContent } from './lib/ui/components/menus/ContextMenu/DefaultContextMenuContent'

// Help menu default component
export { DefaultHelpMenuContent } from './lib/ui/components/menus/HelpMenu/DefaultHelpMenuContent'

// Zoom menu default component
export { DefaultZoomMenuContent } from './lib/ui/components/menus/ZoomMenu/DefaultZoomMenuContent'

// Actions menu default component
export { DefaultActionsMenuContent } from './lib/ui/components/menus/ActionsMenu/DefaultActionsMenuContent'

// Minimap default component
export { DefaultMinimap } from './lib/ui/components/Minimap/DefaultMinimap'

// General UI components for building menus
export { TldrawUiMenuCheckboxItem } from './lib/ui/components/menus/TldrawUiMenuCheckboxItem'
export { TldrawUiMenuContextProvider } from './lib/ui/components/menus/TldrawUiMenuContext'
export { TldrawUiMenuGroup } from './lib/ui/components/menus/TldrawUiMenuGroup'
export { TldrawUiMenuItem } from './lib/ui/components/menus/TldrawUiMenuItem'
export { TldrawUiMenuSubmenu } from './lib/ui/components/menus/TldrawUiMenuSubmenu'
export { unwrapLabel } from './lib/ui/hooks/useActions'

export {
	TldrawUiComponentsProvider,
	useTldrawUiComponents,
	type TLUiComponents,
} from './lib/ui/hooks/useTldrawUiComponents'

export { DefaultPageMenu } from './lib/ui/components/PageMenu/DefaultPageMenu'
export {
	DefaultStylePanel,
	type TLUiStylePanelProps as StylePanelProps,
} from './lib/ui/components/StylePanel/DefaultStylePanel'
export {
	DefaultStylePanelContent,
	type TLUiStylePanelContentProps as StylePanelContentProps,
} from './lib/ui/components/StylePanel/DefaultStylePanelContent'
export { DefaultActionsMenu } from './lib/ui/components/menus/ActionsMenu/DefaultActionsMenu'
export { DefaultContextMenu } from './lib/ui/components/menus/ContextMenu/DefaultContextMenu'
export { DefaultHelpMenu } from './lib/ui/components/menus/HelpMenu/DefaultHelpMenu'
export { DefaultMainMenu } from './lib/ui/components/menus/MainMenu/DefaultMainMenu'
export { DefaultZoomMenu } from './lib/ui/components/menus/ZoomMenu/DefaultZoomMenu'
import * as Dialog from './lib/ui/components/primitives/Dialog'
import * as DropdownMenu from './lib/ui/components/primitives/DropdownMenu'

// N.B. Preserve order of import / export here with this comment.
// Sometimes this can cause an import problem depending on build setup downstream.
export { Dialog, DropdownMenu }
