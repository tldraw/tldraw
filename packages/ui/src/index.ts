import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Contexts
export {
	PORTRAIT_BREAKPOINTS,
	TL_PORTRAIT_BREAKPOINT,
	TldrawUiBreakpointProvider,
	useTldrawUiBreakpoint,
	type TldrawUiBreakpointProviderProps,
} from './lib/context/breakpoint'
export {
	TldrawUiIconProvider,
	useTldrawUiIconUrl,
	type TldrawUiIconProviderProps,
} from './lib/context/icons'
export {
	TldrawUiMenuStateProvider,
	useTldrawUiIsAnyMenuOpen,
	useTldrawUiMenuIsOpen,
	useTldrawUiMenuState,
	type TldrawUiMenuStateContextValue,
	type TldrawUiMenuStateProviderProps,
} from './lib/context/menu-state'
export {
	TldrawUiPlatformProvider,
	useTldrawUiPlatform,
	type TldrawUiPlatformContextValue,
	type TldrawUiPlatformProviderProps,
} from './lib/context/platform'
export {
	TldrawUiPortalProvider,
	useTldrawUiContainer,
	useTldrawUiPortalContainer,
	type TldrawUiPortalProviderProps,
} from './lib/context/portal'
export {
	TldrawUiTranslationProvider,
	useTldrawUiTranslation,
	type TldrawUiTranslationContextValue,
	type TldrawUiTranslationProviderProps,
} from './lib/context/translation'
export { TldrawUiProvider, type TldrawUiProviderProps } from './lib/context/TldrawUiProvider'

// Layout
export {
	TldrawUiColumn,
	TldrawUiGrid,
	TldrawUiOrientationProvider,
	TldrawUiRow,
	useTldrawUiOrientation,
	type TldrawUiLayoutProps,
	type TldrawUiOrientationContext,
	type TldrawUiOrientationProviderProps,
} from './lib/components/layout'

// Core primitives
export {
	TldrawUiButton,
	TldrawUiButtonCheck,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiButtonSpinner,
	type TldrawUiButtonCheckProps,
	type TldrawUiButtonIconProps,
	type TldrawUiButtonLabelProps,
	type TldrawUiButtonProps,
	type TldrawUiButtonType,
} from './lib/components/TldrawUiButton'
export {
	TldrawUiContextMenuContent,
	TldrawUiContextMenuRoot,
	TldrawUiContextMenuTrigger,
	type TldrawUiContextMenuContentProps,
	type TldrawUiContextMenuRootProps,
	type TldrawUiContextMenuTriggerProps,
} from './lib/components/TldrawUiContextMenu'
export {
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogRoot,
	TldrawUiDialogTitle,
	type TldrawUiDialogBodyProps,
	type TldrawUiDialogCloseButtonProps,
	type TldrawUiDialogFooterProps,
	type TldrawUiDialogHeaderProps,
	type TldrawUiDialogRootProps,
	type TldrawUiDialogTitleProps,
} from './lib/components/TldrawUiDialog'
export {
	TldrawUiDialogsProvider,
	useTldrawUiDialogs,
	type TldrawUiDialog,
	type TldrawUiDialogEvent,
	type TldrawUiDialogProps,
	type TldrawUiDialogsContextValue,
	type TldrawUiDialogsProviderProps,
} from './lib/components/TldrawUiDialogs'
export {
	TldrawUiDropdownMenuCheckboxItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuIndicator,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuSub,
	TldrawUiDropdownMenuSubContent,
	TldrawUiDropdownMenuSubTrigger,
	TldrawUiDropdownMenuTrigger,
	type TldrawUiDropdownMenuCheckboxItemProps,
	type TldrawUiDropdownMenuContentProps,
	type TldrawUiDropdownMenuGroupProps,
	type TldrawUiDropdownMenuItemProps,
	type TldrawUiDropdownMenuRootProps,
	type TldrawUiDropdownMenuSubContentProps,
	type TldrawUiDropdownMenuSubProps,
	type TldrawUiDropdownMenuSubTriggerProps,
	type TldrawUiDropdownMenuTriggerProps,
} from './lib/components/TldrawUiDropdownMenu'
export {
	TldrawUiIcon,
	type TldrawUiIconJsx,
	type TldrawUiIconProps,
} from './lib/components/TldrawUiIcon'
export { TldrawUiInput, type TldrawUiInputProps } from './lib/components/TldrawUiInput'
export { TldrawUiKbd, type TldrawUiKbdProps } from './lib/components/TldrawUiKbd'
export {
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	type TldrawUiPopoverContentProps,
	type TldrawUiPopoverProps,
	type TldrawUiPopoverTriggerProps,
} from './lib/components/TldrawUiPopover'
export {
	TldrawUiSelect,
	TldrawUiSelectContent,
	TldrawUiSelectItem,
	TldrawUiSelectTrigger,
	TldrawUiSelectValue,
	type TldrawUiSelectContentProps,
	type TldrawUiSelectItemProps,
	type TldrawUiSelectProps,
	type TldrawUiSelectTriggerProps,
	type TldrawUiSelectValueProps,
} from './lib/components/TldrawUiSelect'
export { TldrawUiSlider, type TldrawUiSliderProps } from './lib/components/TldrawUiSlider'
export { TldrawUiSpinner, type TldrawUiSpinnerProps } from './lib/components/TldrawUiSpinner'
export {
	TldrawUiToast,
	TldrawUiToastProvider,
	TldrawUiToastViewport,
	type TldrawUiToastAction,
	type TldrawUiToastProps,
	type TldrawUiToastProviderProps,
	type TldrawUiToastSeverity,
} from './lib/components/TldrawUiToast'
export {
	TldrawUiToastsProvider,
	useTldrawUiToasts,
	type TldrawUiToastData,
	type TldrawUiToastsContextValue,
	type TldrawUiToastsProviderProps,
} from './lib/components/TldrawUiToasts'
export {
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	TldrawUiToolbarToggleGroup,
	TldrawUiToolbarToggleItem,
	type TldrawUiToolbarButtonProps,
	type TldrawUiToolbarProps,
	type TldrawUiToolbarToggleGroupProps,
	type TldrawUiToolbarToggleItemProps,
} from './lib/components/TldrawUiToolbar'
export {
	TldrawUiTooltip,
	TldrawUiTooltipProvider,
	hideAllTldrawUiTooltips,
	type TldrawUiTooltipProps,
	type TldrawUiTooltipProviderProps,
} from './lib/components/TldrawUiTooltip'
export {
	TldrawUiMenuCheckboxItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	useTldrawUiMenuContext,
	type TldrawUiMenuCheckboxItemProps,
	type TldrawUiMenuContextProviderProps,
	type TldrawUiMenuContextType,
	type TldrawUiMenuGroupProps,
	type TldrawUiMenuItemProps,
	type TldrawUiMenuSubmenuProps,
} from './lib/components/menus'

// App components
export {
	TldrawUiCopyButton,
	type TldrawUiCopyButtonProps,
} from './lib/components/TldrawUiCopyButton'
export {
	TldrawUiMenuControl,
	TldrawUiMenuControlGroup,
	TldrawUiMenuControlInfoTooltip,
	TldrawUiMenuControlLabel,
	TldrawUiMenuDetail,
	TldrawUiMenuSection,
	type TldrawUiMenuControlInfoTooltipProps,
	type TldrawUiMenuControlLabelProps,
	type TldrawUiMenuControlProps,
} from './lib/components/TldrawUiMenuControls'
export { TldrawUiSwitch, type TldrawUiSwitchProps } from './lib/components/TldrawUiSwitch'
export {
	TldrawUiTabsPage,
	TldrawUiTabsRoot,
	TldrawUiTabsTab,
	TldrawUiTabsTabs,
	type TldrawUiTabsContextValue,
	type TldrawUiTabsPageProps,
	type TldrawUiTabsRootProps,
	type TldrawUiTabsTabProps,
	type TldrawUiTabsTabsProps,
} from './lib/components/TldrawUiTabs'

// Utils
export { kbd, kbdStr } from './lib/kbd'
export { preventDefault, stopEventPropagation } from './lib/utils'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
