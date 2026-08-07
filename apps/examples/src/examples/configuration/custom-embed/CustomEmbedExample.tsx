import {
	CustomEmbedDefinition,
	DEFAULT_EMBED_DEFINITIONS,
	DefaultEmbedDefinitionType,
	EmbedShapeUtil,
	TLComponents,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonLabel,
	useActions,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const defaultEmbedTypesToKeep: DefaultEmbedDefinitionType[] = ['tldraw', 'youtube']
const defaultEmbedsToKeep = DEFAULT_EMBED_DEFINITIONS.filter((embed) =>
	defaultEmbedTypesToKeep.includes(embed.type)
)

// [2]
const customEmbed: CustomEmbedDefinition = {
	type: 'jsfiddle',
	title: 'JSFiddle',
	hostnames: ['jsfiddle.net'],
	minWidth: 300,
	minHeight: 300,
	width: 720,
	height: 500,
	doesResize: true,
	toEmbedUrl: (url) => {
		const urlObj = new URL(url)
		const matches = urlObj.pathname.match(/\/([^/]+)\/([^/]+)\/(\d+)\/embedded/)
		if (matches) {
			return `https://jsfiddle.net/${matches[1]}/${matches[2]}/embedded/`
		}
		return
	},
	fromEmbedUrl: (url) => {
		const urlObj = new URL(url)
		const matches = urlObj.pathname.match(/\/([^/]+)\/([^/]+)\/(\d+)\/embedded/)
		if (matches) {
			return `https://jsfiddle.net/${matches[1]}/${matches[2]}/`
		}
		return
	},
	icon: 'https://jsfiddle.net/img/favicon.png',
}

// [3]
const embeds = [...defaultEmbedsToKeep, customEmbed]
const shapeUtils = [EmbedShapeUtil.configure({ embedDefinitions: embeds })]

// [4]
function InsertEmbedButton() {
	const actions = useActions()
	const insertEmbed = actions['insert-embed']
	return (
		<div style={{ pointerEvents: 'all' }}>
			<TldrawUiButton
				type="normal"
				onClick={() => insertEmbed.onSelect('helper-buttons')}
				style={{ backgroundColor: '#e5e5e5' }}
			>
				<TldrawUiButtonLabel>Insert embed</TldrawUiButtonLabel>
			</TldrawUiButton>
		</div>
	)
}

const components: TLComponents = {
	TopPanel: InsertEmbedButton,
}

export default function CustomEmbedExample() {
	return (
		<div className="tldraw__editor">
			{/* [5] */}
			<Tldraw shapeUtils={shapeUtils} components={components} />
		</div>
	)
}

/**

[1]
tldraw has built-in support for embedding content from several popular apps. In this example, we extract the definitions for handling 'tldraw' and 'youtube' content, and discard the rest.

[2]
We will also add support for embedding JSFiddles. Please note that you have to specify an icon that will be displayed in the `EmbedDialog` component.

[3]
We concatenate the filtered embed definitions with our custom JSFiddle one.

[4]
For convenience, we add an "Insert embed" button to the editor's top panel. It uses the `useActions` hook to trigger the built-in `insert-embed` action, which opens the same embed dialog you'd get from the menu — a quick way to see the available embed options.

[5]
We configure `EmbedShapeUtil` with our custom embed definitions and pass the configured util via `shapeUtils`. We also pass our custom `components` to render the button in the `TopPanel` slot.

*/
