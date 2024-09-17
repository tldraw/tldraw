import { db } from '@/utils/ContentDatabase'
import { CodeFiles } from '../content/code-files'
import { ExamplePlaceholder } from './example-placeholder'

export async function Example({
	path,
	showPlaceholder,
}: {
	path: string
	showPlaceholder?: boolean
}) {
	const content = await db.getPageContent(path)
	if (!content || content.type !== 'article') return null
	const server = 'https://examples.tldraw.com'
	const additionalFiles = JSON.parse(content.article.componentCodeFiles ?? '')
	const files = [
		{ name: 'App.tsx', content: content.article.componentCode },
		...Object.keys(additionalFiles).map((key) => ({ name: key, content: additionalFiles[key] })),
	]

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-5 md:px-0">
			<CodeFiles files={files} hideCopyButton className="my-0 lg:h-96" />
			<div className="bg-blue-500 py-1 md:rounded-2xl -mx-5 md:-mx-1 md:px-1">
				<div className="relative h-full md:rounded-xl overflow-hidden shadow bg-white">
					{showPlaceholder ? (
						<ExamplePlaceholder>
							<iframe
								className="iframe"
								src={`${server}/${content.article.id}/full?tldraw_preserve_focus=true`}
								width="100%"
								height={376}
							/>
						</ExamplePlaceholder>
					) : (
						<iframe
							className="iframe"
							src={`${server}/${content.article.id}/full?tldraw_preserve_focus=true`}
							width="100%"
							height={376}
						/>
					)}
				</div>
			</div>
		</div>
	)
}
