import {
	CustomEmbedDefinition,
	DEFAULT_EMBED_DEFINITIONS,
	DefaultEmbedDefinitionType,
	Tldraw,
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

export default function CustomEmbedExample() {
	return (
		<div className="tldraw__editor">
			{/* [4] */}
			<Tldraw embeds={embeds} />
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
We now pass the custom embed definitions to the `Tldraw` component. 

*/
