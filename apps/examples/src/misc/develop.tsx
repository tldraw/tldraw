import { getLicenseKey } from '@tldraw/dotcom-shared'
import { DEFAULT_EMBED_DEFINITIONS, EmbedDefinition, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { usePerformance } from '../hooks/usePerformance'

const safeParseUrl = (url: string) => {
	try {
		return new URL(url)
	} catch (err) {
		return
	}
}

export default function Develop() {
	const performanceOverrides = usePerformance()

	const myEmbedDefinition: EmbedDefinition = {
		type: 'codesandbox',
		title: 'CodeSandbox',
		hostnames: ['codesandbox.io'],
		minWidth: 300,
		minHeight: 300,
		width: 720,
		height: 500,
		doesResize: true,
		toEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			const matches = urlObj && urlObj.pathname.match(/\/s\/([^/]+)\/?/)
			if (matches) {
				return `https://codesandbox.io/embed/${matches[1]}`
			}
			return
		},
		fromEmbedUrl: (url) => {
			const urlObj = safeParseUrl(url)
			const matches = urlObj && urlObj.pathname.match(/\/embed\/([^/]+)\/?/)
			if (matches) {
				return `https://codesandbox.io/s/${matches[1]}`
			}
			return
		},
	}
	const defs = [
		...DEFAULT_EMBED_DEFINITIONS.filter((d) => d.type === 'youtube'),
	] as EmbedDefinition[]
	defs.push(myEmbedDefinition)
	return (
		<div className="tldraw__editor">
			<Tldraw
				licenseKey={getLicenseKey()}
				overrides={[performanceOverrides]}
				persistenceKey="example"
				embeds={defs}
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor
				}}
			/>
		</div>
	)
}
