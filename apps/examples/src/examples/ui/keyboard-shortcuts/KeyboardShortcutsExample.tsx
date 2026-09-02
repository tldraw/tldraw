import { TLUiOverrides, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const overrides: TLUiOverrides = {
	// [a]
	actions(_editor, actions) {
		return {
			...actions,
			'toggle-grid': { ...actions['toggle-grid'], kbd: 'x' },
			'copy-as-png': { ...actions['copy-as-png'], kbd: 'cmd+1,ctrl+1' },
		}
	},
	// [b]
	tools(_editor, tools) {
		return { ...tools, draw: { ...tools.draw, kbd: 'p' } }
	},
}

export default function KeyboardShortcutsExample() {
	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw overrides={overrides} />
		</div>
	)
}

/*
Keyboard shortcuts belong to either tools (draw, eraser, ...) or actions (undo, group,
toggle grid, ...). Both are described by objects with a `kbd` string, so changing a
shortcut is a matter of returning a copy of the object with a different `kbd`.

The `kbd` syntax is a comma-separated list of key combos, e.g. `'x'`, `'shift+x'`,
`'cmd+1,ctrl+1'` (the second combo covers Windows and Linux). The keyboard shortcuts
dialog reads the same `kbd` strings, so it stays in sync with your overrides.

[1]
`overrides` is a `TLUiOverrides` object. Each function receives the defaults and returns
the replacements. It's defined at module level so `<Tldraw>` doesn't see a new object on
every render.
	[a] `toggle-grid` moves from cmd+' to `x`, and `copy-as-png` moves from cmd+shift+c
	to cmd+1. The override replaces the default shortcut rather than adding to it.
	[b] The draw tool moves from `d` to `p`.

[2]
Pass the overrides to `<Tldraw>`. Open the keyboard shortcuts dialog from the help menu
to see the new bindings. For shortcuts on custom tools, see the custom config example.
*/
