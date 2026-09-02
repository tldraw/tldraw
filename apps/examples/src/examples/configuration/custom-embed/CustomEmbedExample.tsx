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
const shapeUtils = [
	EmbedShapeUtil.configure({ embedDefinitions: [...defaultEmbedsToKeep, customEmbed] }),
]

// [4]
function InsertEmbedButton() {
	const actions = useActions()
	return (
		<div className="tlui-menu" style={{ pointerEvents: 'all' }}>
			<TldrawUiButton
				type="normal"
				onClick={() => actions['insert-embed'].onSelect('helper-buttons')}
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
			<Tldraw shapeUtils={shapeUtils} components={components} />
		</div>
	)
}

/*
[1]
tldraw ships embed definitions for several popular apps in `DEFAULT_EMBED_DEFINITIONS`. Here we
keep only the 'tldraw' and 'youtube' ones; the rest will no longer be offered in the embed dialog
or recognized when a URL is pasted.

[2]
A custom definition for JSFiddle. `hostnames` decides which pasted URLs this definition handles,
`toEmbedUrl` turns a page URL into the iframe URL (returning undefined rejects the URL), and
`fromEmbedUrl` maps back for copying the link out. Custom definitions must include an `icon`,
which the embed dialog shows next to the title.

[3]
`EmbedShapeUtil.configure({ embedDefinitions })` replaces the whole list, so include any
defaults you want to keep alongside the custom one.

[4]
An "Insert embed" button in the top panel, so the dialog is one click away. It triggers the
built-in `insert-embed` action via `useActions`, the same one the main menu uses.
*/
