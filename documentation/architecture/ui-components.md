---
title: UI components
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - ui
  - components
  - toolbar
  - menu
  - customization
---

The UI component system in tldraw provides a complete, customizable interface built with React. Every component can be overridden or replaced to create custom editor experiences.

## Overview

tldraw's UI is divided into regions:

```
┌─────────────────────────────────────────────────────────┐
│                    Top Panel                             │
│  (Share button, page menu, actions)                     │
├────────────┬──────────────────────────┬─────────────────┤
│            │                          │                  │
│   Left     │      Canvas              │    Right        │
│   Panel    │                          │    Panel        │
│  (Toolbar) │                          │   (Help menu)   │
│            │                          │                  │
├────────────┴──────────────────────────┴─────────────────┤
│                    Bottom Panel                          │
│  (Navigation, style panel, debug panel)                 │
└─────────────────────────────────────────────────────────┘
```

## Component override system

### Overriding components

Pass custom components via the `components` prop:

```typescript
import { Tldraw, DefaultToolbar } from '@tldraw/tldraw'

function CustomToolbar() {
  return (
    <DefaultToolbar>
      {/* Add custom tools */}
      <MyCustomTool />
    </DefaultToolbar>
  )
}

function App() {
  return (
    <Tldraw
      components={{
        Toolbar: CustomToolbar,
      }}
    />
  )
}
```

### Available component slots

| Component | Description |
|-----------|-------------|
| `TopPanel` | Top area with share, page menu |
| `Toolbar` | Main tool selection |
| `QuickActions` | Undo/redo buttons |
| `ActionsMenu` | Actions dropdown |
| `PageMenu` | Page navigation |
| `StylePanel` | Color, fill, size pickers |
| `NavigationPanel` | Zoom controls |
| `HelpMenu` | Help and keyboard shortcuts |
| `ContextMenu` | Right-click menu |
| `KeyboardShortcutsDialog` | Shortcuts reference |
| `MainMenu` | Main hamburger menu |
| `Minimap` | Document overview |
| `ZoomMenu` | Zoom level selector |

### Hiding components

Return `null` to hide a component:

```typescript
<Tldraw
  components={{
    HelpMenu: null,      // Hide help menu
    StylePanel: null,    // Hide style panel
  }}
/>
```

## Toolbar

### Default toolbar structure

```typescript
function DefaultToolbar() {
  return (
    <div className="tlui-toolbar">
      <DefaultToolbarContent />
    </div>
  )
}

function DefaultToolbarContent() {
  return (
    <>
      <SelectToolbarItem />
      <HandToolbarItem />
      <DrawToolbarItem />
      <EraserToolbarItem />
      <ArrowToolbarItem />
      <TextToolbarItem />
      <GeoToolbarItem />  {/* Rectangle, ellipse, etc. */}
      <MediaToolbarItem /> {/* Image, video, embed */}
      <MoreToolbarItem />  {/* Additional tools */}
    </>
  )
}
```

### Custom toolbar item

```typescript
import { TldrawUiMenuItem, useTools, useEditor } from '@tldraw/tldraw'

function MyToolbarItem() {
  const tools = useTools()
  const myTool = tools['myTool']

  if (!myTool) return null

  return (
    <TldrawUiMenuItem
      id={myTool.id}
      label={myTool.label}
      icon={myTool.icon}
      onClick={() => myTool.onSelect('toolbar')}
      isSelected={myTool.isSelected}
    />
  )
}
```

### Adding to toolbar

```typescript
function CustomToolbar() {
  return (
    <DefaultToolbar>
      <MyToolbarItem />
    </DefaultToolbar>
  )
}
```

## Context menu

### Default context menu

```typescript
function DefaultContextMenu({ children }: { children: ReactNode }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <DefaultContextMenuContent />
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

### Custom context menu items

```typescript
import { DefaultContextMenu, TldrawUiMenuGroup } from '@tldraw/tldraw'

function CustomContextMenu({ children }) {
  return (
    <DefaultContextMenu>
      {/* Default items */}
      <DefaultContextMenuContent />

      {/* Add custom group */}
      <TldrawUiMenuGroup id="custom-group">
        <TldrawUiMenuItem
          id="my-action"
          label="My Action"
          onSelect={handleMyAction}
        />
      </TldrawUiMenuGroup>
    </DefaultContextMenu>
  )
}
```

## Style panel

### Default style panel

```typescript
function DefaultStylePanel() {
  const editor = useEditor()
  const styles = editor.getSharedStyles()

  return (
    <div className="tlui-style-panel">
      <ColorStylePicker style={DefaultColorStyle} styles={styles} />
      <FillStylePicker style={DefaultFillStyle} styles={styles} />
      <DashStylePicker style={DefaultDashStyle} styles={styles} />
      <SizeStylePicker style={DefaultSizeStyle} styles={styles} />
      {/* ... more style pickers */}
    </div>
  )
}
```

### Custom style picker

```typescript
function CustomColorPicker() {
  const editor = useEditor()
  const sharedStyles = editor.getSharedStyles()
  const color = sharedStyles.get(DefaultColorStyle)

  const handleChange = (newColor: string) => {
    editor.setStyleForSelectedShapes(DefaultColorStyle, newColor)
  }

  return (
    <div className="custom-color-picker">
      {COLORS.map(c => (
        <button
          key={c}
          className={c === color.value ? 'selected' : ''}
          onClick={() => handleChange(c)}
          style={{ backgroundColor: getThemeColor(c) }}
        />
      ))}
    </div>
  )
}
```

## Menu system

### Menu groups

```typescript
<TldrawUiMenuGroup id="clipboard">
  <TldrawUiMenuItem
    id="cut"
    label="Cut"
    kbd="$x"
    onSelect={() => editor.cut()}
  />
  <TldrawUiMenuItem
    id="copy"
    label="Copy"
    kbd="$c"
    onSelect={() => editor.copy()}
  />
  <TldrawUiMenuItem
    id="paste"
    label="Paste"
    kbd="$v"
    onSelect={() => editor.paste()}
  />
</TldrawUiMenuGroup>
```

### Submenus

```typescript
<TldrawUiMenuSubmenu id="arrange" label="Arrange">
  <TldrawUiMenuItem
    id="bring-to-front"
    label="Bring to front"
    kbd="⇧$]"
    onSelect={() => editor.bringToFront()}
  />
  <TldrawUiMenuItem
    id="send-to-back"
    label="Send to back"
    kbd="⇧$["
    onSelect={() => editor.sendToBack()}
  />
</TldrawUiMenuSubmenu>
```

### Checkboxes and toggles

```typescript
<TldrawUiMenuCheckboxItem
  id="snap-mode"
  label="Snap to grid"
  checked={editor.getInstanceState().isGridMode}
  onSelect={() => editor.setInstanceState({ isGridMode: !isGridMode })}
/>
```

## Dialogs

### Built-in dialogs

```typescript
// Keyboard shortcuts dialog
const dialogs = useDialogs()
dialogs.addDialog({
  id: 'keyboard-shortcuts',
  component: KeyboardShortcutsDialog,
})
```

### Custom dialog

```typescript
function MyCustomDialog({ onClose }) {
  return (
    <Dialog onClose={onClose}>
      <Dialog.Title>My Dialog</Dialog.Title>
      <Dialog.Content>
        <p>Dialog content here</p>
      </Dialog.Content>
      <Dialog.Footer>
        <Button onClick={onClose}>Close</Button>
      </Dialog.Footer>
    </Dialog>
  )
}

// Open the dialog
dialogs.addDialog({
  id: 'my-dialog',
  component: MyCustomDialog,
})
```

## Toast notifications

```typescript
const toasts = useToasts()

// Show a toast
toasts.addToast({
  id: uniqueId(),
  title: 'Saved',
  description: 'Your changes have been saved.',
  severity: 'success', // 'info' | 'success' | 'warning' | 'error'
})
```

## Responsive design

### Breakpoints

tldraw adapts UI to screen size:

```typescript
const breakpoints = {
  mobile: 0,      // < 640px
  tablet: 640,    // 640-1024px
  desktop: 1024,  // > 1024px
}
```

### Using breakpoints

```typescript
function useBreakpoint() {
  const container = useContainer()
  const { width } = container.getBoundingClientRect()

  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

function ResponsiveToolbar() {
  const breakpoint = useBreakpoint()

  if (breakpoint === 'mobile') {
    return <MobileToolbar />
  }

  return <DesktopToolbar />
}
```

## CSS customization

### CSS custom properties

```css
.tl-container {
  /* Colors */
  --tl-background: #f8f9fa;
  --tl-foreground: #212529;

  /* UI sizing */
  --tl-toolbar-height: 48px;
  --tl-panel-padding: 8px;

  /* Typography */
  --tl-font-ui: 'Inter', sans-serif;
}
```

### Targeting specific components

```css
/* Toolbar */
.tlui-toolbar {
  background: var(--tl-background);
  border-radius: 8px;
}

/* Style panel */
.tlui-style-panel {
  min-width: 200px;
}

/* Context menu */
.tlui-context-menu {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

## Hooks for UI

### useEditor

Access the editor instance:

```typescript
const editor = useEditor()

const shapes = editor.getSelectedShapes()
const tool = editor.getCurrentToolId()
```

### useIsToolSelected

Check if a tool is active:

```typescript
const isSelectTool = useIsToolSelected('select')
```

### useValue

Subscribe to reactive values:

```typescript
const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
```

### useTranslation

Access translations:

```typescript
const msg = useTranslation()

return <button>{msg('action.undo')}</button>
```

## Key files

- packages/tldraw/src/lib/ui/TldrawUi.tsx - Main UI wrapper
- packages/tldraw/src/lib/ui/components/ - UI component implementations
- packages/tldraw/src/lib/ui/hooks/ - UI-specific hooks
- packages/tldraw/src/lib/ui/context/ - UI context providers

## Related

- [Style system](./style-system.md) - Style panel implementation
- [Tool system](./tool-system.md) - Toolbar tool integration
- [UI customization guide](../guides/ui-customization.md) - Detailed customization
