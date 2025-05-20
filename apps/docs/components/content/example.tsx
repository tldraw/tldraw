import { Embed } from '@/components/content/embed'
import { Article } from '@/types/content-types'
import { CodeFiles } from './code-files'

export function Example({ article }: { article: Article }) {
	const server = 'https://examples.tldraw.com'
	const additionalFiles = JSON.parse(article.componentCodeFiles ?? '')
	const files = [
		{ name: 'App.tsx', content: article.componentCode },
		...Object.keys(additionalFiles).map((key) => ({ name: key, content: additionalFiles[key] })),
	]

	return (
		<div className="w-full mt-12">
			<Embed src={`${server}/${article.id}/full?utm_source=docs-embed`} />
			<CodeFiles files={files} />
		</div>
	)
}
