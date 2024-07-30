import { Code } from '@/components/content/code'
import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Button } from '../common/button'

export const InstallationSection = () => {
	return (
		<Section>
			<SectionHeading subheading="Features" heading="Easy Installation" />
			<div className="flex flex-col items-center gap-8 mt-8 md:max-w-xl mx-auto">
				<Code files={[code.terminal]} hideTabs className="my-0 w-full" />
				<Code files={[code.app]} className="my-0 w-full" />
				<p className="text-center max-w-lg text-balance px-5">
					Import the styles and render the Tldraw React component inside your app. Easy as that.
				</p>
				<Button href="/quick-start" caption="Get Started" />
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
