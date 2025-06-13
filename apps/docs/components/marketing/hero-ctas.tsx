import { Button } from '@/components/common/button'

export function HeroCtas() {
	return (
		<div className="px-4 w-full flex justify-center">
			<div className="w-full flex flex-col items-center gap-x-4 gap-y-4 flex-wrap justify-center sm:max-width-xl">
				<Button
					className="hidden sm:flex"
					id="hero-quick-start"
					href="/quick-start"
					caption="Build whiteboards and more with the tldraw SDK"
					type="black"
					size="lg"
					// arrow="right"
				/>
				<Button
					className="flex sm:hidden"
					id="hero-quick-start"
					href="/quick-start"
					caption="Build with the tldraw SDK"
					type="black"
					size="lg"
					arrow="right"
				/>
				<Button
					id="hero-github"
					href="https://github.com/tldraw/tldraw"
					caption="40K stars on GitHub"
					type="tertiary"
					size="lg"
					icon="github"
					newTab
				/>
			</div>
		</div>
	)
}
