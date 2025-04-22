import { CodeFiles } from '@/components/content/code-files'
import { Section } from '@/components/marketing/section'
import { Button } from '../common/button'
import { SectionSubtitle } from './section-description'
import { SectionTitle } from './section-title'

export function InstallationSection() {
	return (
		<Section id="installation" className="px-0 md:px-5 max-w-screen-xl">
			<SectionTitle>Our canvas. Your code.</SectionTitle>
			<SectionSubtitle>
				The tldraw SDK provides a complete canvas experience as a React component. Extend,
				customize, and develop on top.
			</SectionSubtitle>
			<div className="flex flex-col items-center gap-8 mx-auto mt-8 w-full md:max-w-2xl md:px-5">
				<CodeFiles files={[code.terminal]} hideTabs className="w-full my-0" />
				<CodeFiles files={[code.app]} className="w-full my-0" />
				<div className="flex gap-4 flex-wrap items-center justify-center px-4">
					<Button id="code-examples" href="/examples" caption="Browse examples" />
					<Button
						id="code-quick-start-"
						href="https://stackblitz.com/edit/vitejs-vite-ahoswhus?file=src%2FApp.tsx"
						caption="Open Sandbox"
						arrow="right"
						type="tertiary"
						newTab
					/>{' '}
				</div>
			</div>
		</Section>
	)
}

const code = {
	terminal: {
		name: 'Terminal',
		content: `npm install tldraw`,
	},
	app: {
		name: 'App.jsx',
		content: `import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export function App() { 	
  return <Tldraw /> 		
}`,
	},
}
