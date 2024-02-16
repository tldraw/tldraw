'use client'

import { SandpackCodeViewer, SandpackFiles, SandpackProvider } from '@codesandbox/sandpack-react'
import { useTheme } from 'next-themes'

export const Code = (props: any) => {
	if (!props.className) {
		return <code {...props} />
	}

	const language = props.className.replace('language-', '')
	return <CodeBlock code={{ [`App.${language}`]: props.children.trim() }} />
}

export function CodeBlock({ code }: { code: SandpackFiles }) {
	const { theme } = useTheme()

	const trimmedCode = Object.fromEntries(
		Object.entries(code).map(([key, value]) => [key, (value as string).trim()])
	)
	return (
		<div className="code-example">
			<SandpackProvider
				className="sandpack"
				key={`sandpack-${theme}`}
				template="react-ts"
				options={{ activeFile: Object.keys(code)[0] }}
				customSetup={{
					dependencies: {
						'@tldraw/assets': 'latest',
						'@tldraw/tldraw': 'latest',
					},
				}}
				files={trimmedCode}
				theme={theme === 'dark' ? 'dark' : 'light'}
			>
				<SandpackCodeViewer />
			</SandpackProvider>
		</div>
	)
}
