'use client'

import { SandpackCodeViewer, SandpackFiles, SandpackProvider } from '@codesandbox/sandpack-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export const Code = (props: any) => {
	if (!props.className) {
		return <code {...props} />
	}

	const language = props.className.replace('language-', '')
	return <CodeBlock code={{ [`App.${language}`]: props.children.trim() }} />
}

export function CodeBlock({ code }: { code: SandpackFiles }) {
	const [isClientSide, setIsClientSide] = useState(false)
	const { theme } = useTheme()
	useEffect(() => setIsClientSide(true), [])

	// This is to avoid hydration mismatch between the server and the client because of the useTheme.
	if (!isClientSide) {
		return null
	}

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
						tldraw: 'latest',
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
