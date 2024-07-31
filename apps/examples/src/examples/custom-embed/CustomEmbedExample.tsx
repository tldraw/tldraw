import { EmbedDefinition, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

const embeds: readonly EmbedDefinition[] = [
	{
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
	},
]

export default function CustomEmbedExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw embeds={embeds} />
		</div>
	)
}
