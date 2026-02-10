'use client'

import { heroDemoCodeSnippet } from '@/lib/hero-demo-code'
import { useEffect, useState } from 'react'
import type { Editor } from 'tldraw'
import {
	ContainerProvider,
	DefaultStylePanel,
	DefaultToolbar,
	EditorProvider,
	Tldraw,
	TldrawUiContextProvider,
	defaultEditorAssetUrls,
} from 'tldraw'

const options = {
	actionShortcutsLocation: 'toolbar' as const,
}

const components = {
	StylePanel: null,
	MenuPanel: null,
	NavigationPanel: null,
	Toolbar: null,
}

export interface HeroDemoProps {
	/** Pre-rendered syntax-highlighted HTML for the code block (from Shiki) */
	codeHtml?: string
}

export function HeroDemo({ codeHtml }: HeroDemoProps) {
	const [editor, setEditor] = useState<Editor | null>(null)

	function handleMount(ed: Editor) {
		setEditor(ed)
	}

	useEffect(() => {
		if (!editor) return

		let isBlurred = true

		function handleBodyPointerDown() {
			if (!editor || isBlurred) return
			editor.blur({ blurContainer: true })
			isBlurred = true
		}

		function handleEvent(event: { type: string; name: string }) {
			if (editor && event.type === 'pointer' && event.name === 'pointer_down') {
				isBlurred = false
				editor.focus({ focusContainer: true })
				editor.getContainer().focus()
			}
		}

		editor.on('event', handleEvent)
		document.body.addEventListener('pointerdown', handleBodyPointerDown)

		return () => {
			editor.off('event', handleEvent)
			document.body.removeEventListener('pointerdown', handleBodyPointerDown)
		}
	}, [editor])

	return (
		<div className="mt-12 w-full overflow-visible">
			<div className="flex flex-col gap-0 overflow-visible rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 lg:flex-row">
				{/* Code editor - dark theme matches tldraw.dev reference */}
				<div className="min-w-0 flex-1 border-b border-zinc-200 dark:border-zinc-800 lg:w-1/2 lg:border-b-0 lg:border-r">
					<div className="flex items-center gap-2 border-b border-zinc-700 bg-zinc-900 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-950">
						<svg
							className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="1.5"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
							/>
						</svg>
						<span className="font-mono text-sm text-zinc-400">App.tsx</span>
					</div>
					{codeHtml ? (
						<div
							className="code-block-content hero-demo-code-content overflow-x-auto bg-zinc-900 p-4 font-mono text-sm leading-relaxed dark:bg-zinc-950 [&_.shiki]:!bg-transparent [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!p-0"
							dangerouslySetInnerHTML={{ __html: codeHtml }}
						/>
					) : (
						<pre className="overflow-x-auto bg-zinc-900 p-4 font-mono text-sm leading-relaxed text-zinc-200 dark:bg-zinc-950 dark:text-zinc-300">
							<code>{heroDemoCodeSnippet}</code>
						</pre>
					)}
				</div>
				{/* Canvas - white bg and blue border match tldraw.dev reference */}
				<div className="relative flex min-h-[280px] flex-1 overflow-visible border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:min-h-[320px] lg:w-1/2 lg:border-l-0 lg:border-t-0">
					<div
						className="tldraw_demo w-full border-2 border-blue-500 dark:border-blue-400"
						onPointerDown={(e) => e.stopPropagation()}
					>
						<Tldraw
							onMount={handleMount}
							persistenceKey="website-hero-demo"
							initialState="draw"
							autoFocus={false}
							options={options}
							forceMobile={true}
							components={components}
							licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
							assetUrls={defaultEditorAssetUrls}
						/>
						{editor && (
							<div className="demo_ui">
								<div className="tl-container tl-theme__light">
									<ContainerProvider container={editor.getContainer()}>
										<EditorProvider editor={editor}>
											<TldrawUiContextProvider forceMobile>
												<DefaultStylePanel />
												<DefaultToolbar />
											</TldrawUiContextProvider>
										</EditorProvider>
									</ContainerProvider>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
