import { CustomEmbedDefinition, DEFAULT_EMBED_DEFINITIONS, TLEmbedDefinition, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const embedsToKeep = ['tldraw', 'youtube']

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
const embeds: TLEmbedDefinition[] = [
	...DEFAULT_EMBED_DEFINITIONS.filter((embed) => embedsToKeep.includes(embed.type)),
	customEmbed,
]

export default function CustomEmbedExample() {
	return (
		<div className="tldraw__editor">
			{/* [4] */}
			<Tldraw embeds={embeds} />
		</div>
	)
}

/**
[1] The embeds to keep are the default embeds that we want to keep in the editor.

[2] This is the custom embed definition for JSFiddle. It has a type of 'jsfiddle'. Please note that you have to specify an icon that will be displayed in the `EmbedDialog`.

[3] We concatenate the default embed definitions with the custom embed definition. We filter the default embed definitions to only include the embeds that we want to keep.

[4] We pass the custom embed definitions to the `Tldraw` component as a prop. The editor will now include the custom embed definition for JSFiddle.

*/
