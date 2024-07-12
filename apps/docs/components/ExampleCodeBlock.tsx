'use client'

import { SandpackCodeViewer, SandpackFiles, SandpackProvider } from '@codesandbox/sandpack-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ExampleCodeBlock({
	articleId,
	files = {},
	activeFile,
}: {
	articleId: string
	activeFile: string
	files: SandpackFiles
}) {
	const [isClientSide, setIsClientSide] = useState(false)
	const { theme } = useTheme()
	useEffect(() => setIsClientSide(true), [])

	// This is to avoid hydration mismatch between the server and the client because of the useTheme.
	if (!isClientSide) {
		return null
	}

	const SERVER =
		process.env.NODE_ENV === 'development'
			? `http://${location.hostname}:5420`
			: location.host.includes('staging') || location.host.includes('canary')
				? `https://examples-canary.tldraw.com`
				: 'https://examples.tldraw.com'

	return (
		<div className="code-example">
			<iframe src={`${SERVER}/${articleId}/full`} />
			<SandpackProvider
				className="sandpack"
				key={`sandpack-${theme}-${activeFile}`}
				template="react-ts"
				options={{ activeFile }}
				customSetup={{
					dependencies: {
						'@tldraw/assets': 'latest',
						tldraw: 'latest',
					},
				}}
				files={{
					...files,
				}}
				theme={theme === 'dark' ? 'dark' : 'light'}
			>
				<SandpackCodeViewer />
			</SandpackProvider>
		</div>
	)
}
