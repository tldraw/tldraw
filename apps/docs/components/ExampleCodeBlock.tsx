'use client'

import { SandpackCodeEditor, SandpackFiles, SandpackProvider } from '@codesandbox/sandpack-react'
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
	const SERVER =
		process.env.NODE_ENV === 'development' ? 'http://localhost:5420' : 'https://examples.tldraw.com'

	if (!isClientSide) {
		return null
	}

	return (
		<>
			<iframe
				src={`${SERVER}/${articleId}/full`}
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
				theme={theme === 'dark' ? 'dark' : 'light'}
			>
				<SandpackCodeEditor readOnly />
			</SandpackProvider>
		</>
	)
}
