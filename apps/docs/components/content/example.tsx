import { Article } from '@/types/content-types'
import { Code } from '../code'
import { Embed } from './embed'

export const Example: React.FC<{ article: Article }> = ({ article }) => {
	const server = 'https://examples.tldraw.com'
	const additionalFiles = JSON.parse(article.componentCodeFiles ?? '')
	const files = [
		{ name: 'App.tsx', content: article.componentCode },
		...Object.keys(additionalFiles).map((key) => ({ name: key, content: additionalFiles[key] })),
	]

	return (
		<div className="w-full mt-12">
			<Embed src={`${server}/${article.id}/full`} />
			<Code files={files} />
		</div>
	)
}
