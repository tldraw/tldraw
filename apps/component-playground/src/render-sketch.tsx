import { ReactNode } from 'react'
import { LoadedSketch } from './registry'

/** Render a loaded sketch: its explicit `render()`, else its component with args. */
export function renderSketch(
	loaded: LoadedSketch,
	args: Record<string, unknown> = loaded.sketch.args ?? {}
): ReactNode {
	const { sketchbook, sketch } = loaded
	if (sketch.render) return sketch.render(args)
	if (sketchbook.component) {
		const Component = sketchbook.component
		return <Component {...args} />
	}
	return <em>This sketch has no component or render().</em>
}
