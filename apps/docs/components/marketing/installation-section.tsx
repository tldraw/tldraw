import { Code } from '@/components/content/code'
import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Button } from '../common/button'

export const InstallationSection = () => {
	return (
		<Section>
			<SectionHeading
				subheading="Features"
				heading="Installation"
				description="Install the tldraw package, import the styles, and render the component in your React app."
			/>
			<div className="flex flex-col items-center gap-8 mt-8 md:max-w-2xl mx-auto">
				<Code files={[code.terminal]} hideTabs className="my-0 w-full" />
				<Code files={[code.app]} className="my-0 w-full" />
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
