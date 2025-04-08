import { BlueA } from '../common/blue-a'
import { Section } from './section'
import { SectionSubtitle } from './section-description'
import { SectionH3 } from './section-h3'
import { SectionProse } from './section-prose'
import { SectionTitle } from './section-title'

export function WhatItIsSection() {
	return (
		<Section id="features">
			<SectionTitle>What&apos;s inside</SectionTitle>
			<SectionSubtitle>Have an idea that uses a canvas? Build it with tldraw.</SectionSubtitle>
			<SectionProse>
				<h3>
					<b>We bring the canvas</b>, you build the product.
				</h3>
				<p>
					With the tldraw SDK, you get a unified system that includes a high-performance canvas and
					a <BlueA href="/docs/editor">runtime API</BlueA> to control it. The canvas itself renders
					fast in HTML and CSS. It is built entirely in React, with each shape returning its own
					React component.
				</p>
				<SectionH3>Feature complete</SectionH3>
				<p>
					The SDK comes feature complete with default tools for selection, drawing, erasing,
					creating geometric shapes, and perfect freehand drawing. It offers dozens of tightly
					integrated systems for layout, drag and drop, undo and redo, copy and paste,{' '}
					<BlueA href="/docs/persistence">persistence</BlueA>, migration, embedded content, gifs,
					videos, rich text, image export, cross-tab synchronization, and more.
				</p>
				<SectionH3>Made for developers</SectionH3>
				<p>
					Keep what you need, discard the rest, and build your own. The tldraw SDK is built from the
					start for customization and extension. Use our APIs to create your own tools,
					interactions, and canvas elements. Change the{' '}
					<BlueA href="/docs/user-interface">user interface</BlueA> using our included primitives or
					build a new one.
				</p>
				<SectionH3>Collaboration</SectionH3>
				<p>
					Looking for collaboration? The SDK has you covered. With the{' '}
					<BlueA href="/docs/sync">tldraw sync</BlueA> module, you can self-deploy a backend and
					connect for low-latency, highly optimized multiplayer collaboration. Connect your own
					backend with our <BlueA href="/docs/collaboration">collaboration</BlueA> APIs.
				</p>
				<SectionH3>Ready for AI</SectionH3>
				<p>
					Experimenting with AI? Try the{' '}
					<BlueA newTab href="https://github.com/tldraw/ai">
						tldraw ai
					</BlueA>{' '}
					module. Create prompts, interpret content, and drive the canvas with language models. See
					our experiments:{' '}
					<BlueA newTab href="https://makereal.tldraw.com/">
						Make Real
					</BlueA>
					,{' '}
					<BlueA newTab href="https://teach.tldraw.com/">
						Teach
					</BlueA>
					, and{' '}
					<BlueA newTab href="https://computer.tldraw.com/">
						tldraw computer
					</BlueA>
					.
				</p>
			</SectionProse>
		</Section>
	)
}
