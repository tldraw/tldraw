/// <reference types="react" />

// eslint-disable-next-line local/no-export-star
export * from '@tldraw/editor'
export { Tldraw } from './lib/Tldraw'
export { defaultShapeTools } from './lib/defaultShapeTools'
export { defaultShapeUtils } from './lib/defaultShapeUtils'
export { defaultTools } from './lib/defaultTools'
// UI
export { TldrawUi, type TldrawUiBaseProps, type TldrawUiProps } from './lib/ui/TldrawUi'
export {
	TldrawUiContextProvider,
	type TldrawUiContextProviderProps,
} from './lib/ui/TldrawUiContextProvider'
export { setDefaultUiAssetUrls } from './lib/ui/assetUrls'
export { ContextMenu, type TLUiContextMenuProps } from './lib/ui/components/ContextMenu'
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
export {
	useActionsMenuSchema,
	type TLUiActionsMenuSchemaContextType,
} from './lib/ui/hooks/useActionsMenuSchema'
export { AssetUrlsProvider, useAssetUrls } from './lib/ui/hooks/useAssetUrls'
export { BreakPointProvider, useBreakpoint } from './lib/ui/hooks/useBreakpoint'
export { useCanRedo } from './lib/ui/hooks/useCanRedo'
export { useCanUndo } from './lib/ui/hooks/useCanUndo'
export { useMenuClipboardEvents, useNativeClipboardEvents } from './lib/ui/hooks/useClipboardEvents'
export {
	useContextMenuSchema,
	type TLUiContextTTLUiMenuSchemaContextType,
} from './lib/ui/hooks/useContextMenuSchema'
export { useCopyAs } from './lib/ui/hooks/useCopyAs'
export {
	useDialogs,
	type TLUiDialog,
	type TLUiDialogProps,
	type TLUiDialogsContextType,
} from './lib/ui/hooks/useDialogsProvider'
export {
	useEvents,
	type TLUiEventContextType,
	type TLUiEventHandler,
	type TLUiEventSource,
} from './lib/ui/hooks/useEventsProvider'
export { useExportAs } from './lib/ui/hooks/useExportAs'
export {
	useHelpMenuSchema,
	type TLUiHelpMenuSchemaContextType,
} from './lib/ui/hooks/useHelpMenuSchema'
export { useKeyboardShortcuts } from './lib/ui/hooks/useKeyboardShortcuts'
export {
	useKeyboardShortcutsSchema,
	type TLUiKeyboardShortcutsSchemaContextType,
	type TLUiKeyboardShortcutsSchemaProviderProps,
} from './lib/ui/hooks/useKeyboardShortcutsSchema'
export { useLocalStorageState } from './lib/ui/hooks/useLocalStorageState'
export { useMenuIsOpen } from './lib/ui/hooks/useMenuIsOpen'
export {
	useMenuSchema,
	type TLUiMenuSchemaContextType,
	type TLUiMenuSchemaProviderProps,
} from './lib/ui/hooks/useMenuSchema'
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
export { buildFromV1Document } from './lib/utils/buildFromV1Document'
export {
	parseAndLoadDocument,
	parseTldrawJsonFile,
	serializeTldrawJson,
	type TldrawFile,
} from './lib/utils/file'
export { Dialog, DropdownMenu }

import * as Dialog from './lib/ui/components/primitives/Dialog'
import * as DropdownMenu from './lib/ui/components/primitives/DropdownMenu'
