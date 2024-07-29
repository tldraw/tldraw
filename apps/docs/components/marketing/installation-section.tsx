import { Code } from '@/components/content/code'
import { Section } from '@/components/marketing/section'
import { SectionHeading } from '@/components/marketing/section-heading'
import { Button } from '../common/button'

export const InstallationSection = () => {
	return (
		<Section>
			<SectionHeading subheading="Features" heading="Easy Installation" />
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto px-5 md:px-0">
				<Code files={[code.terminal]} hideCopyButton className="my-0" />
				<Code files={[code.app]} hideCopyButton className="my-0" />
			</div>
			<div className="flex flex-col items-center gap-8 mt-8 px-5">
				<p className="text-center max-w-lg text-balance">
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
		content: `npm install tldraw
                        
yarn add tldraw

pnpm install tldraw`,
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
