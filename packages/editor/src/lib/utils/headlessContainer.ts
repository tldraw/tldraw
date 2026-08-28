const noop = () => {
	// intentionally empty
}

/**
 * A stand-in container for editors constructed without `getContainer`. It satisfies only the
 * surface the non-rendering subsystems reach for. Anything it doesn't enumerate reads as
 * `undefined`, so a new container dependency in a core manager fails visibly instead of
 * silently misbehaving.
 *
 * @internal
 */
export function createHeadlessContainer(): HTMLElement {
	const body = {
		addEventListener: noop,
		removeEventListener: noop,
		appendChild: (node: unknown) => node,
		removeChild: (node: unknown) => node,
	}

	const ownerDocument = {
		body,
		addEventListener: noop,
		removeEventListener: noop,
		createElement: () => createHeadlessElement(),
		createDocumentFragment: () => createHeadlessElement(),
		activeElement: null,
		title: '',
	}

	function createHeadlessElement() {
		const classes = new Set<string>()
		const el: any = {
			classList: {
				add: (name: string) => void classes.add(name),
				remove: (name: string) => void classes.delete(name),
				contains: (name: string) => classes.has(name),
			},
			style: { setProperty: noop, removeProperty: noop, getPropertyValue: () => '' },
			setAttribute: noop,
			removeAttribute: noop,
			addEventListener: noop,
			removeEventListener: noop,
			appendChild: (node: unknown) => node,
			removeChild: (node: unknown) => node,
			remove: noop,
			focus: noop,
			blur: noop,
			tabIndex: -1,
			innerHTML: '',
			textContent: '',
			getBoundingClientRect: () => ({
				x: 0,
				y: 0,
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				width: 0,
				height: 0,
			}),
			ownerDocument,
		}
		return el
	}

	return createHeadlessElement() as HTMLElement
}
