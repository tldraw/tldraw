declare namespace React {
	interface HTMLAttributes {
		/**
		 * Indicates the browser should ignore the element and its contents in terms of interaction.
		 * This is a boolean attribute but isn't properly supported by react yet - pass "" to enable
		 * it, or undefined to disable it.
		 *
		 * https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
		 */
		inert?: ''
	}
}

declare module '*.svg' {
	const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>
	export default content
}

// Only Vite's glob import, not all of vite/client, whose `*.svg` module would clash with the one above.
interface ImportMeta {
	glob: import('vite/types/importGlob').ImportGlobFunction
}
