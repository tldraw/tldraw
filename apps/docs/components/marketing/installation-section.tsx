import { CodeFiles } from '@/components/content/code-files'
import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Button } from '../common/button'

export function InstallationSection() {
	return (
		<Section>
			<SectionHeading
				subheading="code"
				heading="Installation"
				description="Install the tldraw package, import the styles, and render the component in your React app."
			/>
			<div className="flex flex-col items-center gap-8 mx-auto mt-8 md:max-w-2xl">
				<CodeFiles files={[code.terminal]} hideTabs className="w-full my-0" />
				<CodeFiles files={[code.app]} className="w-full my-0" />
				<Button href="/quick-start" caption="Read our Quick Start guide" />
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

export default function App() { 	
  return <Tldraw /> 		
}`,
	},
}
