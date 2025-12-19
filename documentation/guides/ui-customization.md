---
title: UI customization
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - ui
  - customization
  - components
  - toolbar
  - menu
---

This guide explains how to customize tldraw's user interface, including replacing default components and adding custom UI elements.

## Overview

tldraw's UI is fully customizable through the `components` prop. Every UI element can be replaced, extended, or removed.

## Component overrides

### Basic override

```typescript
import { Tldraw, TLComponents } from 'tldraw'

const components: TLComponents = {
  // Remove the page menu
  PageMenu: null,

  // Custom toolbar
  Toolbar: MyCustomToolbar,
}

function App() {
  return <Tldraw components={components} />
}
```

### Available components

| Component         | Description                  |
| ----------------- | ---------------------------- |
| `Toolbar`         | Main toolbar with tools      |
| `PageMenu`        | Page switcher menu           |
| `MainMenu`        | Hamburger menu               |
| `StylePanel`      | Style editing panel          |
| `NavigationPanel` | Zoom and navigation controls |
| `ActionsMenu`     | Action dropdown menu         |
| `ContextMenu`     | Right-click context menu     |
| `HelpMenu`        | Help and keyboard shortcuts  |
| `DebugPanel`      | Debug information            |
| `DebugMenu`       | Debug menu                   |

### Canvas overlays

| Component            | Description               |
| -------------------- | ------------------------- |
| `InFrontOfTheCanvas` | Renders above shapes      |
| `OnTheCanvas`        | Renders at canvas level   |
| `Background`         | Renders behind everything |
| `Grid`               | Grid pattern              |
| `Scribble`           | Drawing preview           |
| `SnapIndicator`      | Snap lines                |
| `Spinner`            | Loading indicator         |

## Custom toolbar

```typescript
import { DefaultToolbar, TldrawUiMenuItem, useTools } from 'tldraw'

function CustomToolbar() {
  const tools = useTools()

  return (
    <DefaultToolbar>
      {/* Add custom tool button */}
      <TldrawUiMenuItem
        id="my-tool"
        label="My Tool"
        icon="star"
        onClick={() => tools['my-tool']?.onSelect('toolbar')}
      />
    </DefaultToolbar>
  )
}

<Tldraw components={{ Toolbar: CustomToolbar }} />
```

## Custom menu items

### Actions menu

```typescript
import { DefaultActionsMenu, TldrawUiMenuGroup, TldrawUiMenuItem, useEditor } from 'tldraw'

function CustomActionsMenu() {
  const editor = useEditor()

  return (
    <DefaultActionsMenu>
      <TldrawUiMenuGroup id="custom">
        <TldrawUiMenuItem
          id="export-png"
          label="Export as PNG"
          icon="external-link"
          onClick={() => {
            // Export logic
          }}
        />
      </TldrawUiMenuGroup>
    </DefaultActionsMenu>
  )
}
```

### Context menu

```typescript
import { DefaultContextMenu, TldrawUiMenuGroup, TldrawUiMenuItem } from 'tldraw'

function CustomContextMenu() {
  return (
    <DefaultContextMenu>
      <TldrawUiMenuGroup id="custom-actions">
        <TldrawUiMenuItem
          id="custom-action"
          label="Custom Action"
          onClick={() => {
            // Handle action
          }}
        />
      </TldrawUiMenuGroup>
    </DefaultContextMenu>
  )
}
```

## Canvas overlays

### In front of canvas

```typescript
import { useEditor, track } from 'tldraw'

const SelectionInfo = track(function SelectionInfo() {
  const editor = useEditor()
  const selectedShapes = editor.getSelectedShapes()

  if (selectedShapes.length === 0) return null

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      background: 'white',
      padding: 8,
      borderRadius: 4,
    }}>
      {selectedShapes.length} shapes selected
    </div>
  )
})

<Tldraw components={{ InFrontOfTheCanvas: SelectionInfo }} />
```

### Custom background

```typescript
function CustomBackground() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: 'url(/pattern.svg)',
      backgroundRepeat: 'repeat',
    }} />
  )
}

<Tldraw components={{ Background: CustomBackground }} />
```

## Keyboard shortcuts

### Custom shortcuts

```typescript
import { TLUiOverrides } from 'tldraw'

const overrides: TLUiOverrides = {
  tools(editor, tools) {
    // Add keyboard shortcut for custom tool
    tools.stamp = {
      id: 'stamp',
      icon: 'star',
      label: 'Stamp',
      kbd: 's', // Press 's' to activate
      onSelect: () => editor.setCurrentTool('stamp'),
    }
    return tools
  },

  actions(editor, actions) {
    // Add custom action with shortcut
    actions.exportPng = {
      id: 'export-png',
      label: 'Export PNG',
      kbd: '$e', // Cmd/Ctrl + E
      onSelect: () => {
        // Export logic
      },
    }
    return actions
  },
}

<Tldraw overrides={overrides} />
```

### Shortcut modifiers

- `$` - Cmd (Mac) / Ctrl (Windows)
- `!` - Alt
- `?` - Shift

Example: `$?s` = Cmd+Shift+S (Mac) or Ctrl+Shift+S (Windows)

## Styling

### CSS variables

Override tldraw's CSS variables:

```css
.tldraw__editor {
	--color-primary: #3b82f6;
	--color-selected: #3b82f6;
	--color-background: #ffffff;
	--color-panel: #f8fafc;
	--radius-2: 8px;
}
```

### Dark mode

```typescript
<Tldraw
  user={{
    isDarkMode: true,
  }}
/>
```

### Custom theme

```css
/* Dark theme overrides */
.tldraw.tldraw--dark {
	--color-background: #0f172a;
	--color-panel: #1e293b;
	--color-text: #f1f5f9;
}
```

## Hooks for UI

### useTools

Access registered tools:

```typescript
import { useTools } from 'tldraw'

function ToolButtons() {
  const tools = useTools()

  return (
    <div>
      {Object.entries(tools).map(([id, tool]) => (
        <button key={id} onClick={() => tool.onSelect('toolbar')}>
          {tool.label}
        </button>
      ))}
    </div>
  )
}
```

### useActions

Access registered actions:

```typescript
import { useActions } from 'tldraw'

function ActionButtons() {
  const actions = useActions()

  return (
    <button onClick={() => actions['copy'].onSelect('menu')}>
      Copy
    </button>
  )
}
```

### useIsToolSelected

Check if a tool is active:

```typescript
import { useIsToolSelected } from 'tldraw'

function ToolButton({ toolId }) {
  const isSelected = useIsToolSelected(toolId)

  return (
    <button
      style={{ background: isSelected ? 'blue' : 'white' }}
      onClick={() => /* activate tool */}
    >
      {toolId}
    </button>
  )
}
```

## Removing UI entirely

```typescript
const components: TLComponents = {
  Toolbar: null,
  PageMenu: null,
  MainMenu: null,
  StylePanel: null,
  NavigationPanel: null,
  ActionsMenu: null,
  ContextMenu: null,
  HelpMenu: null,
}

// Minimal editor with no UI
<Tldraw components={components} hideUi />
```

## Related

- [UI components](../architecture/ui-components.md) - Architecture
- [Custom tools](./custom-tools.md) - Adding tools
- [Style system](../architecture/style-system.md) - Theming
