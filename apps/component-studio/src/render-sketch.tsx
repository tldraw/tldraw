import { ReactNode } from 'react'
import { LoadedSketch } from './registry'

/** Render a loaded sketch: its explicit `render()`, else its component with args. */
export function renderSketch(
	loaded: LoadedSketch,
	args: Record<string, unknown> = loaded.sketch.args ?? {}
): ReactNode {
	const content = renderContent(loaded, args)
	const pseudo = loaded.sketch.parameters?.pseudo
	// A `pseudo-*` wrapper forces the component's interaction-state styles (see the
	// `.pseudo-* .x` rules alongside `:hover`/`:focus-visible` in component CSS).
	// `display: contents` keeps the wrapper out of layout while staying a DOM ancestor.
	if (pseudo) {
		return (
			<div className={`pseudo-${pseudo}`} style={{ display: 'contents' }}>
				{content}
			</div>
		)
	}
	return content
}

function renderContent(loaded: LoadedSketch, args: Record<string, unknown>): ReactNode {
	const { sketchbook, sketch } = loaded
	if (sketch.render) return sketch.render(args)
	if (sketchbook.component) {
		const Component = sketchbook.component
		return <Component {...args} />
	}
	return <em>This sketch has no component or render().</em>
}
