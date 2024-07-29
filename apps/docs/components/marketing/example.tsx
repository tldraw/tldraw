import { getPageContent } from '@/utils/get-page-content'
import { Code } from '../content/code'

export const Example: React.FC<{ path: string }> = async ({ path }) => {
	const content = await getPageContent(path)
	if (!content || content.type !== 'article') return null
	const server = 'https://examples.tldraw.com'
	const additionalFiles = JSON.parse(content.article.componentCodeFiles ?? '')
	const files = [
		{ name: 'App.tsx', content: content.article.componentCode },
		...Object.keys(additionalFiles).map((key) => ({ name: key, content: additionalFiles[key] })),
	]

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-5 md:px-0">
			<Code files={files} hideCopyButton className="my-0 lg:h-96" />
			<div className="bg-blue-500 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1">
				<div className="md:rounded-xl overflow-hidden shadow bg-white">
					<iframe
						className="iframe"
						src={`${server}/${content.article.id}/full`}
						width="100%"
						height={376}
					/>
				</div>
			</div>
		</div>
	)
}
