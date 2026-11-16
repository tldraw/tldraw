# @tldraw/command-palette

A Cmd/Ctrl+K command palette for tldraw: a searchable list of actions, tools, pages, styles and
preferences, built from the same `TldrawUiMenu*` components as tldraw's other menus.

```tsx
import { CommandPalette, commandPaletteOverrides } from '@tldraw/command-palette'
import '@tldraw/command-palette/command-palette.css'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function App() {
	return <Tldraw components={{ CommandPalette }} overrides={commandPaletteOverrides} />
}
```

`CommandPalette` goes in the `CommandPalette` component slot and renders the palette while it's
open. `commandPaletteOverrides` adds the `open-command-palette` action, bound to Cmd/Ctrl+K. Wrap
`CommandPalette` to pass `position`, `suggestions`, `actionGroups` or your own items as children.

The command palette is a licensed feature. It runs in development without a key; in production it
needs a tldraw license that includes the command palette, or `CommandPalette` renders nothing and
Cmd/Ctrl+K does nothing. See [License key](https://tldraw.dev/sdk-features/license-key).

See the [UI components docs](https://tldraw.dev/sdk-features/ui-components#Command-palette) and the
[command palette example](https://tldraw.dev/examples/ui/command-palette).
