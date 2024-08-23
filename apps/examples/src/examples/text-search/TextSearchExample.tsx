import { TLComponents, TLUiOverrides, Tldraw, atom, track } from 'tldraw'
import 'tldraw/tldraw.css'
import { TextSearchPanel } from './TextSearchPanel'
import './text-search.css'

export const showSearch = atom('showSearch', false)

const components: TLComponents = {
	HelperButtons: TextSearchPanel,
}

const overrides: TLUiOverrides = {
	actions(_editor, actions) {
		return {
			...actions,
			'text-search': {
				id: 'text-search',
				label: 'Search',
				kbd: '$f',
				onSelect() {
					if (!showSearch.get()) {
						showSearch.set(true)
					}
				},
				enabled() {
					return true
				},
			},
		}
	},
}

const TextSearchExample = track(() => {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="text-search-example" overrides={overrides} components={components} />
		</div>
	)
})

export default TextSearchExample
