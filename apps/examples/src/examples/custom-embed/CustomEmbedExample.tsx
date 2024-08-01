import {
	CustomEmbedDefinition,
	DEFAULT_EMBED_DEFINITIONS,
	DefaultEmbedDefinitionType,
	Tldraw,
} from 'tldraw'
import 'tldraw/tldraw.css'

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
	return <Tldraw embeds={embeds} />
}

/**
[1] tldraw comes with several default embed definitions. In this example, we filter the default embed definitions to only include the 'tldraw' and 'youtube' embed definitions. 

[2] This is the custom embed definition for JSFiddle. Please note that you have to specify an icon that will be displayed in the `EmbedDialog`.

[3] We concatenate the default embed definitions with the custom embed definition. 

[4] We pass the custom embed definitions to the `Tldraw` component as a prop. 

*/
