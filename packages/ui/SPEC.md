# @tldraw/ui — extraction spec

This package is a standalone UI component library extracted from the tldraw SDK
(`packages/tldraw/src/lib/ui/components/primitives`) and the tldraw.com client
(`apps/dotcom/client/src/tla/components`). It provides the componentry for both.

## Hard rules

- Allowed dependencies: `react`, `react-dom` (peers), `radix-ui`, `classnames`,
  `@tldraw/state`, `@tldraw/state-react`, `@tldraw/utils`.
- FORBIDDEN imports: `@tldraw/editor`, `tldraw`, `@tldraw/tlschema`, `@tldraw/store`,
  `@tldraw/assets`, any app code. No circular dependencies.
- Radix imports come from the unified `radix-ui` package (e.g. `import { DropdownMenu as _DropdownMenu } from 'radix-ui'`),
  matching how `packages/tldraw` uses it.
- No CSS modules. Styles live in plain css partials in `src/styles/*.css`; the
  `scripts/build-css.mjs` script concatenates them into `ui.css` at the package root
  (tokens.css first, then base.css, then the rest alphabetically).
- Components are presentational/headless: no editor instance, no analytics, no i18n
  library, no routing. Anything the old code got from `@tldraw/editor` is provided by
  a context in `src/lib/context/` or by props.
- Follow existing repo TS style. Every exported symbol needs a `@public` (or
  `@internal`) TSDoc tag, like other packages, or api-extractor will complain.
- Do not use `useLayoutEffect` unguarded for SSR; match existing patterns.

## CSS conventions

- One block prefix: `tl-`. Strict BEM: `tl-block`, `tl-block__element`,
  `tl-block--modifier`, `tl-block__element--modifier`.
  (The old SDK css used `tlui-button__primary` for what is really a modifier —
  convert those to proper `--modifier` form: `tl-button--primary`.)
- CSS custom properties use the `--tl-` prefix.
- State via `data-*` attributes where Radix provides them (`[data-state='open']`,
  `[data-highlighted]`) is fine and preferred over JS-toggled modifier classes.
- Everything is scoped under the root class `.tl-ui` (the element rendered by
  `TldrawUiProvider`). Tokens are defined on `.tl-ui`; themes on
  `.tl-ui.tl-ui--light` / `.tl-ui.tl-ui--dark`.
- `src/styles/tokens.css` defines the full token set copied (same names, same
  values) from `packages/editor/editor.css` `.tl-container` + theme blocks:
  `--tl-space-1..10`, `--tl-radius-0..4`, `--tl-color-*` (all of them),
  `--tl-shadow-1..4`, plus the ui layer vars from `packages/tldraw/src/lib/ui.css`
  (`--tl-layer-above`, `--tl-layer-panels`, `--tl-layer-menus`, `--tl-layer-toasts`,
  etc, and `--tl-sab`). Also adopt the dotcom tokens from
  `apps/dotcom/client/src/tla/styles/tla.css`, renamed `--tla-*` → `--tl-*`:
  `--tl-font-ui`, `--tl-color-sidebar`, `--tl-color-inactive`,
  `--tl-color-inactive-hover`, `--tl-color-primary-hover`, `--tl-color-secondary`,
  `--tl-color-secondary-hover`, `--tl-color-secondary-border`.
  Both themes must be complete (dark must define every token light defines).
- Port the focus-ring behavior: `.tl-ui--focus-visible` utility patterns from
  `.tl-container__focused` may be simplified to standard `:focus-visible` rules.

## File layout and exports (fixed — do not invent new top-level files)

`src/index.ts` re-exports every module below with `export * from`. Each module
must exist with exactly these exported component names.

### Contexts (`src/lib/context/`)

- `portal.tsx` — `TldrawUiPortalProvider({ container: HTMLElement | null, children })`,
  `useTldrawUiPortalContainer(): HTMLElement | undefined` (undefined → Radix portals
  fall back to document.body). `@public`.
- `translation.tsx` — `TldrawUiTranslationProvider({ dir?: 'ltr' | 'rtl', msg?: (key: string) => string | undefined, children })`
  and `useTldrawUiTranslation(): { dir: 'ltr' | 'rtl', msg: (key: string, fallback: string) => string }`.
  `msg(key, fallback)` returns the provider translation if present, else the fallback.
  Components ALWAYS pass an English fallback, so the library works with no provider.
- `icons.tsx` — `TldrawUiIconProvider({ assetUrls: Record<string, string>, children })`,
  `useTldrawUiIconUrl(icon: string): string | undefined`. No bundled icons: apps inject
  their own urls. Nested providers merge (child overrides parent).
- `menu-state.tsx` — tracks open menus in an `atom<Set<string>>` from `@tldraw/state`.
  `TldrawUiMenuStateProvider({ children, onMenuOpenChange?: (id: string, isOpen: boolean) => void })`,
  `useTldrawUiMenuIsOpen(id: string): [isOpen: boolean, onOpenChange: (isOpen: boolean) => void]`,
  `useTldrawUiIsAnyMenuOpen(): boolean`. Works (locally, per-hook state) without a provider.
- `platform.tsx` — `TldrawUiPlatformProvider({ isDarwin?, isCoarsePointer?, animationSpeed?, children })`
  with defaults detected from `navigator`/`matchMedia` (guard for SSR);
  `useTldrawUiPlatform(): { isDarwin: boolean, isCoarsePointer: boolean, animationSpeed: number }`.
- `breakpoint.tsx` — `TldrawUiBreakpointProvider({ breakpoint: number, children })`,
  `useTldrawUiBreakpoint(): number` (default 7 = desktop). Export the
  `TL_PORTRAIT_BREAKPOINT` constant object copied from
  `packages/tldraw/src/lib/ui/constants.ts` (`PORTRAIT_BREAKPOINT`).
- `TldrawUiProvider.tsx` — composes all of the above plus the tooltip provider and
  renders `<div className={classNames('tl-ui', theme === 'dark' ? 'tl-ui--dark' : 'tl-ui--light', className)}>`.
  Props: `{ theme?: 'light' | 'dark', dir?, msg?, iconAssetUrls?, container?, breakpoint?, onMenuOpenChange?, className?, children }`.
  The rendered div is also the default portal container (via ref) when `container`
  is not provided.

### Utils

- `src/lib/utils.ts` — `preventDefault`, `stopEventPropagation` (copy the tiny
  helpers from `packages/editor/src/lib/utils/dom.ts`; do NOT import editor).
- `src/lib/kbd.ts` — port `packages/tldraw/src/lib/ui/kbd-utils.ts` (`kbd`, `kbdStr`)
  but take `isDarwin: boolean` as an argument instead of reading `tlenv`.

### Layout (`src/lib/components/layout.tsx`)

Port `packages/tldraw/src/lib/ui/components/primitives/layout.tsx` nearly as-is:
`TldrawUiOrientationProvider`, `useTldrawUiOrientation`, `TldrawUiRow`, `TldrawUiColumn`, `TldrawUiGrid`.
Classes: `tl-row`, `tl-column`, `tl-grid`.

### Core primitives (`src/lib/components/`)

Port from `packages/tldraw/src/lib/ui/components/primitives/**`. Rename
`TldrawUiX` → `TldrawUiX`. Replace editor couplings per the context list above.

- `TldrawUiIcon.tsx` — `TldrawUiIcon` (props: `icon: string | ReactElement`, `label?`, `small?`,
  `tiny?`, `className?`, `crossOrigin?`). Mask-based like `TldrawUiIcon`, url from
  `useTldrawUiIconUrl`; when the url is missing render the placeholder div
  (`tl-icon tl-icon--placeholder`). Classes: `tl-icon`, `tl-icon--small`, `tl-icon--tiny`.
- `TldrawUiSpinner.tsx` — `TldrawUiSpinner` inline SVG spinner (copy the SVG from
  `packages/editor/src/lib/components/default-components/DefaultSpinner.tsx`),
  props `{ label?: string }` for aria. Class `tl-spinner`.
- `TldrawUiButton.tsx` — `TldrawUiButton`, `TldrawUiButtonIcon`, `TldrawUiButtonLabel`, `TldrawUiButtonCheck`,
  `TldrawUiButtonSpinner`. `TldrawUiButton` props like `TldrawUiButton` but
  `type` includes both SDK and dotcom variants:
  `'normal' | 'primary' | 'danger' | 'low' | 'icon' | 'tool' | 'menu' | 'help' | 'secondary' | 'cta' | 'ghost'`
  (last three ported from dotcom `TlaButton`/`TlaCtaButton` styling), plus
  `isActive?`, `tooltip?`, `tooltipSide?`, `disableRipple` not needed.
  Classes: `tl-button`, `tl-button--primary` … `tl-button__label`, `tl-button__icon`,
  `tl-button__check`, `tl-button__spinner`, `data-isactive`.
- `TldrawUiKbd.tsx` — `TldrawUiKbd` (props `{ children: string, visibleOnMobileLayout?: boolean }`),
  uses `useTldrawUiBreakpoint` + `useTldrawUiPlatform` + `kbd()`. Class `tl-kbd`.
- `TldrawUiInput.tsx` — port `TldrawUiInput`. Replace `useMaybeEditor` timers with plain
  `setTimeout` + cleanup, `tlenv.isIos` with `useTldrawUiPlatform`-adjacent detection
  (copy the small iOS check inline), `editor.getContainerWindow()` with
  `ownerDocument.defaultView`. Classes `tl-input`, `tl-input__wrapper`.
- `TldrawUiSlider.tsx` — port `TldrawUiSlider` on Radix Slider. `tltime.setTimeout` →
  plain `setTimeout` with cleanup. Label strings via props with English fallbacks.
  Classes `tl-slider`, `tl-slider__container`, `tl-slider__track`, `tl-slider__range`, `tl-slider__thumb`.
- `TldrawUiTooltip.tsx` — `TldrawUiTooltipProvider`, `TldrawUiTooltip`, `hideAllTldrawUiTooltips`. Port the
  singleton tooltip manager from `TldrawUiTooltip.tsx` but replace editor deps:
  timers → plain timeout with cleanup; `tlenvReactive.isCoarsePointer` →
  `useTldrawUiPlatform().isCoarsePointer`; camera-moving / a11y checks → optional
  `TldrawUiTooltipProviderProps` callbacks `{ isMoving?: () => boolean }`; document via
  ref ownerDocument. Keep the same UX (single tooltip element, delay grouping).
  Classes `tl-tooltip`, `tl-tooltip__arrow`.
- `TldrawUiToolbar.tsx` — `TldrawUiToolbar`, `TldrawUiToolbarButton`, `TldrawUiToolbarToggleGroup`,
  `TldrawUiToolbarToggleItem` on Radix Toolbar + layout + TldrawUiTooltip.
  Classes `tl-toolbar`, `tl-toolbar__toggle-group`, `tl-toolbar__toggle-item`.
- `TldrawUiPopover.tsx` — `TldrawUiPopover`, `TldrawUiPopoverTrigger`, `TldrawUiPopoverContent` on Radix
  Popover; `useTldrawUiMenuIsOpen` for open state; portal container from context.
  Classes `tl-popover`, `tl-popover__content`.
- `TldrawUiSelect.tsx` — `TldrawUiSelect`, `TldrawUiSelectTrigger`, `TldrawUiSelectValue`, `TldrawUiSelectContent`,
  `TldrawUiSelectItem` on Radix Select. Also fold in the dotcom `TlaMenuSelect` niceties:
  `TldrawUiSelectItem` supports a `destructive?` flag. Classes `tl-select`,
  `tl-select__trigger`, `tl-select__value`, `tl-select__chevron`, `tl-select__content`,
  `tl-select__viewport`, `tl-select__item`, `tl-select__item-indicator`,
  `tl-select__item--destructive`.
- `TldrawUiDropdownMenu.tsx` — full family ported from `TldrawUiDropdownMenu.tsx`:
  `TldrawUiDropdownMenuRoot`, `TldrawUiDropdownMenuTrigger`, `TldrawUiDropdownMenuContent`,
  `TldrawUiDropdownMenuSub`, `TldrawUiDropdownMenuSubTrigger`, `TldrawUiDropdownMenuSubContent`,
  `TldrawUiDropdownMenuGroup`, `TldrawUiDropdownMenuIndicator`, `TldrawUiDropdownMenuItem`,
  `TldrawUiDropdownMenuCheckboxItem`. Menu panel class `tl-menu` (+ `data-size`),
  `tl-menu__group`, `tl-menu__submenu-trigger`, `tl-menu__checkbox-indicator`.
- `TldrawUiDialog.tsx` — structural parts `TldrawUiDialogHeader`, `TldrawUiDialogTitle`,
  `TldrawUiDialogCloseButton`, `TldrawUiDialogBody`, `TldrawUiDialogFooter` PLUS a self-contained
  `TldrawUiDialogRoot({ open, onOpenChange, children, ...})` wrapping Radix Dialog with
  overlay + content + portal (the SDK keeps its dialog manager in tldraw; this
  package just needs a usable standalone shell). Classes `tl-dialog`,
  `tl-dialog__overlay`, `tl-dialog__content`, `tl-dialog__header`,
  `tl-dialog__header__title`, `tl-dialog__header__close`, `tl-dialog__body`, `tl-dialog__footer`.
- `TldrawUiToast.tsx` — port the presentational part of
  `packages/tldraw/src/lib/ui/components/Toasts.tsx` on Radix Toast:
  `TldrawUiToastProvider`, `TldrawUiToast` (severity, title, description, actions),
  `TldrawUiToastViewport`. No toast manager/store — apps own state. Classes `tl-toast`,
  `tl-toast__viewport`, `tl-toast__icon`, `tl-toast__main`, `tl-toast__content`,
  `tl-toast__title`, `tl-toast__description`, `tl-toast__actions`, `tl-toast--error` etc.
- `menus.tsx` — presentational menu system ported from
  `primitives/menus/` WITHOUT the actions/tools registries:
  `TldrawUiMenuContextProvider({ type, sourceId, children })`, `useTldrawUiMenuContext`,
  `TldrawUiMenuGroup`, `TldrawUiMenuItem`, `TldrawUiMenuCheckboxItem`, `TldrawUiMenuSubmenu`.
  `TldrawUiMenuItem` props: `{ id, kbd?, label?, icon?, iconLeft?, disabled?, busy?, isSelected?, readonlyOk?, onSelect, spinner? }` —
  label is a plain string (no translation keys). Supports menu types
  `'menu' | 'context-menu' | 'panel' | 'small-icons'` (drop the editor-toolbar
  modes that need the Editor). Context-menu variants use Radix ContextMenu.
- `TldrawUiContextMenu.tsx` — thin Radix ContextMenu wrappers so apps can build context
  menus with the same `tl-menu` styling: `TldrawUiContextMenuRoot`, `TldrawUiContextMenuTrigger`,
  `TldrawUiContextMenuContent`.

### App components ported from dotcom (`src/lib/components/`)

- `TldrawUiSwitch.tsx` — `TldrawUiSwitch({ checked, onChange, disabled?, label? })` ported from
  `TlaMenuSwitch` (`apps/dotcom/client/src/tla/components/tla-menu/tla-menu.tsx`).
  Classes `tl-switch`, `tl-switch__thumb`, `data-checked`.
- `TldrawUiTabs.tsx` — `TldrawUiTabsRoot({ activeTab, onTabChange, children })`, `TldrawUiTabsTabs`,
  `TldrawUiTabsTab({ id })`, `TldrawUiTabsPage({ id })` ported from `TlaMenuTabs*`.
  Classes `tl-tabs`, `tl-tabs__tabs`, `tl-tabs__tab`, `tl-tabs__tab--active`, `tl-tabs__page`.
- `TldrawUiMenuControls.tsx` — ported from tla-menu: `TldrawUiMenuSection`, `TldrawUiMenuControlGroup`,
  `TldrawUiMenuControl`, `TldrawUiMenuControlLabel`, `TldrawUiMenuControlInfoTooltip`, `TldrawUiMenuDetail`.
  Classes `tl-menu-section`, `tl-menu-control-group`, `tl-menu-control`,
  `tl-menu-control__label`, `tl-menu-control__info`, `tl-menu-detail`.
- `TldrawUiCopyButton.tsx` — ported from `TlaShareMenuCopyButton`
  (`apps/dotcom/client/src/tla/components/TlaFileShareMenu/file-share-menu-primitives.tsx`):
  `TldrawUiCopyButton({ onCopy | value, children, type? })` with the success flip state.
  Built on `TldrawUiButton`. Class `tl-copy-button`.

### CSS partials (`src/styles/`)

`tokens.css`, `base.css` (root `.tl-ui` resets, focus rules, `tl-row/column/grid`),
then one partial per component family: `button.css`, `icon.css`, `input.css`,
`kbd.css`, `menu.css` (dropdown/context/menu items/groups), `popover.css`,
`select.css`, `slider.css`, `spinner.css`, `switch.css`, `tabs.css`, `toast.css`,
`toolbar.css`, `tooltip.css`, `dialog.css`, `menu-controls.css`, `copy-button.css`.
Port the visual appearance faithfully from `packages/tldraw/src/lib/ui.css`
(tlui-\*) and the dotcom css modules, translated to the BEM names above.
Every rule scoped under `.tl-ui` (e.g. `.tl-ui .tl-button` or nesting).

## Verification

From repo root: `yarn typecheck`. Tests optional. Do not run repo-wide builds.
