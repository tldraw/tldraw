import { TLComponents, TLUiOverrides, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { showSearch, TextSearchPanel } from './TextSearchPanel'
import './text-search.css'

// There's a guide at the bottom of this file!

// [1]
const components: TLComponents = {
	HelperButtons: TextSearchPanel,
}

// [2]
const overrides: TLUiOverrides = {
	actions(_editor, actions) {
		return {
			...actions,
			'text-search': {
				id: 'text-search',
				label: 'Search',
				kbd: 'cmd+f,ctrl+f',
				onSelect() {
					showSearch.set(true)
				},
			},
		}
	},
}

export default function TextSearchExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="text-search-example" overrides={overrides} components={components} />
		</div>
	)
}

/*
[1]
The search panel renders in the `HelperButtons` slot, which sits at the top left of the canvas under
the menu panel. See TextSearchPanel.tsx for the search itself.

[2]
Registering an action with `kbd: 'cmd+f,ctrl+f'` takes over the browser's find shortcut while the
editor is focused. The action just flips a shared `atom`; the panel reads that atom with `track` so it
shows and hides reactively.
*/
