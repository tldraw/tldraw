import {
	InMemoryLibrarySource,
	type ItemTileProps,
	ItemTile,
	type LibrariesComponents,
	type TLLibraryItem,
} from '@tldraw/libraries'
import { Editor } from 'tldraw'
import { LibrariesExample, type Showing } from './libraries-example'
import { saveSamples, shapeSample, WIREFRAMES } from './libraries-samples'

// Unlisted, like /develop: @tldraw/libraries is unreleased. The panel with its item tiles replaced
// by captioned ones and its + tile hidden.

const PAGES = ['Custom components'] as const

function CaptionedItemTile(props: ItemTileProps & { item: TLLibraryItem }) {
	return (
		<div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
			<ItemTile {...props} />
			<span
				style={{
					padding: '2px 4px 6px',
					fontSize: 11,
					color: 'var(--tl-color-text-3)',
					textAlign: 'center',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				}}
			>
				{props.item.name ?? 'Unnamed'}
			</span>
		</div>
	)
}

const components: LibrariesComponents = {
	ItemTile: CaptionedItemTile,
	AddSelectionTile: null,
}

const source = new InMemoryLibrarySource({ id: 'libraries-custom-components' })

const showing: Showing = {
	source,
	components,
	seed: async (editor) => {
		const wireframes = await source.createLibrary('Wireframes')
		await saveSamples(editor, source, wireframes.id, WIREFRAMES)
		const shapes = await source.createLibrary('Shapes')
		const samples = Array.from({ length: 5 }, (_, i) => shapeSample(i))
		await saveSamples(editor, source, shapes.id, samples)
	},
}

const getShowing = (_editor: Editor) => showing

export default function LibrariesCustomComponents() {
	return (
		<LibrariesExample
			persistenceKey="libraries-custom-components"
			pages={PAGES}
			getShowing={getShowing}
		/>
	)
}
