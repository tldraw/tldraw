import { ComponentType, ReactNode } from 'react'

/**
 * The default export of a `*.sketchbook.tsx` file declares a sketchbook: which
 * component this file stages, and where it sits in the studio nav.
 *
 * `Props` is deliberately required, not defaulted — parametrizing with the real
 * props type is what makes `args` type-check against the component.
 */
export interface Sketchbook<Props> {
	/** Slash-delimited path that builds the nav tree, e.g. `'Comments/Thread'`. */
	title: string
	/** The component every sketch in this sketchbook stages. */
	component?: ComponentType<Props>
	/**
	 * Optional per-arg control overrides. Keyed by the component's prop names, so a
	 * typo is a type error. Any arg without an entry falls back to a control inferred
	 * from its value — the point of declaring one is mainly `select`, whose options
	 * can't be recovered from a runtime value.
	 */
	argTypes?: Partial<Record<keyof Props & string, ArgType>>
}

/** How the controls panel should edit an arg. */
export type ArgType =
	| { control: 'text' }
	| { control: 'number' }
	| { control: 'boolean' }
	| { control: 'select'; options: string[] }

/**
 * A named export of a `*.sketchbook.tsx` file: the staged component in one state.
 * Give `args` to feed the sketchbook's `component`, or `render` to draw it directly.
 */
export interface Sketch<Props> {
	args?: Partial<Props>
	render?(args: Partial<Props>): ReactNode
}
