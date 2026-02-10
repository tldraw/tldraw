import { codeToHtml } from 'shiki'
import { CopyButton } from './copy-button'

interface CodeBlockProps {
	code: string
	language?: string
	caption?: string
}

export async function CodeBlock({ code, language, caption }: CodeBlockProps) {
	// Strip meta (e.g. "tsx {2,4,6}") to prevent line highlighting - use only the language
	const lang = (language || 'typescript').split(/\s/)[0] ?? 'typescript'
	const html = await codeToHtml(code, {
		lang,
		themes: {
			light: 'github-light',
			dark: 'github-dark',
		},
	})

	return (
		<figure className="not-prose group relative my-8">
			<div className="relative overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-900 dark:border-zinc-700/50 dark:bg-zinc-950">
				{/* Header bar with language label and copy button */}
				<div className="flex items-center justify-between border-b border-zinc-700/50 bg-zinc-800/50 px-4 py-2 dark:border-zinc-700/50 dark:bg-zinc-800/50">
					<span className="select-none font-mono text-xs text-zinc-400 dark:text-zinc-500">
						{lang}
					</span>
					<CopyButton code={code} />
				</div>
				{/* Highlighted code content */}
				<div
					className="code-block-content overflow-x-auto text-[13px] leading-relaxed [&_.shiki]:!bg-transparent [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!p-4"
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			</div>
			{caption && (
				<figcaption className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
					{caption}
				</figcaption>
			)}
		</figure>
	)
}
