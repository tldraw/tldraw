import { Sandpack } from '@codesandbox/sandpack-react'
import { useTheme } from 'next-themes'

type PlaygroundProps = {
	template?: any
	files: string
	children: string
}

export default function Playground(props: PlaygroundProps) {
	const { template = 'react-ts', files } = props
	const theme = useTheme()

	return (
		<Sandpack
			template={template}
			theme={theme.theme === 'dark' ? 'dark' : 'light'}
			files={files}
			customSetup={{
				dependencies: {
					'@tldraw/tldraw': 'canary',
					react: '^18.2.0',
					'react-dom': '^18.2.0',
					signia: '^0.1.4',
					'signia-react': '^0.1.4',
				},
			}}
			options={{
				showLineNumbers: false,
				showInlineErrors: true,
				showTabs: false,
				closableTabs: false,
				showRefreshButton: true,
				showNavigator: false,
				showConsole: false,
			}}
		/>
	)
}
