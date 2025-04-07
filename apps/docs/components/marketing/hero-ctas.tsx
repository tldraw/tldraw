import { Button } from '@/components/common/button'

export function HeroCtas() {
	return (
		<div className="px-4 w-full flex justify-center">
			<div className="w-full flex flex-col items-center gap-x-4 gap-y-4 flex-wrap justify-center sm:max-width-xl">
				<Button
					id="hero-quick-start"
					href="/quick-start"
					caption="Build whiteboards and more with the tldraw SDK"
					type="black"
					size="lg"
				/>
				<Button
					id="hero-github"
					href="https://github.com/tldraw/tldraw"
					caption="39K stars on GitHub"
					type="tertiary"
					size="lg"
					icon="github"
					newTab
				/>
			</div>
		</div>
	)
}
