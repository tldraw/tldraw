import { TLComponents, TLUiOverrides, Tldraw, atom, track } from 'tldraw'
import 'tldraw/tldraw.css'
import { TextSearchPanel } from './TextSearchPanel'
import './slides.css'

export const showSearch = atom('showSearch', false)

const components: TLComponents = {
	HelperButtons: TextSearchPanel,
	Minimap: null,
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
			},
		}
	},
}

const SlidesExample = track(() => {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="slideshow_example" overrides={overrides} components={components} />
		</div>
	)
})

export default SlidesExample
