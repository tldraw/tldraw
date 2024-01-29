'use client'

import { SandpackCodeEditor, SandpackFiles, SandpackProvider } from '@codesandbox/sandpack-react'
import { useTheme } from 'next-themes'

export default function ExampleCodeBlock({
	articleId,
	files = {},
	activeFile,
}: {
	articleId: string
	activeFile: string
	files: SandpackFiles
}) {
	const { theme } = useTheme()

	return (
		<div>
			<iframe
				src={`http://localhost:5420/${articleId}/full`}
				style={{ border: 0, height: '50vh', width: '100%' }}
			/>
			<SandpackProvider
				key={`sandpack-${theme}-${activeFile}`}
				template="react-ts"
				options={{ activeFile }}
				customSetup={{
					dependencies: {
						'@tldraw/assets': 'latest',
						'@tldraw/tldraw': 'latest',
					},
				}}
				files={{
					...files,
				}}
				// theme={theme === 'dark' ? 'dark' : 'light'}  // TODO fix
				theme="dark"
			>
				<SandpackCodeEditor readOnly />
			</SandpackProvider>
		</div>
	)
}
