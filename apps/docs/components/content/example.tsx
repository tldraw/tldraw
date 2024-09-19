import { CodeFiles } from '@/components/content/code-files'
import { Embed } from '@/components/content/embed'
import { Article } from '@/types/content-types'

export function Example({ article }: { article: Article }) {
	const server = 'https://examples.tldraw.com'
	const additionalFiles = JSON.parse(article.componentCodeFiles ?? '')
	const files = [
		{ name: 'App.tsx', content: article.componentCode },
		...Object.keys(additionalFiles).map((key) => ({ name: key, content: additionalFiles[key] })),
	]

	return (
		<div className="w-full mt-12">
			{/* Disable auto focus using the preserveFocus search param */}
			<Embed src={`${server}/${article.id}/full?preserveFocus=true`} />
			<CodeFiles files={files} />
		</div>
	)
}
