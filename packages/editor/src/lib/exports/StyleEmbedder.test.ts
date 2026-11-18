import { vi } from 'vitest'
import { StyleEmbedder } from './StyleEmbedder'

// jsdom has no `computedStyleMap`, so we fake one the way Chrome behaves: an element lists the
// standard properties it has a value for, in a fixed order, then its custom properties. A
// detached element has no computed style and lists nothing.
const STANDARD_PROPERTIES = ['color', 'margin-top', 'padding-left']
const computedStyles = new WeakMap<Element, Record<string, string>>()
let keysCalls = 0

function fakeComputedStyleMap(this: Element) {
	const values = this.isConnected ? (computedStyles.get(this) ?? {}) : {}
	return {
		*keys() {
			keysCalls++
			yield* STANDARD_PROPERTIES.filter((property) => property in values)
			yield* Object.keys(values).filter((property) => property.startsWith('--'))
		},
		get(property: string) {
			const value = values[property]
			return value === undefined ? undefined : { toString: () => value }
		},
	}
}

function el(tagName: string, values: Record<string, string>, children: Element[] = []) {
	const element = document.createElement(tagName)
	computedStyles.set(element, values)
	element.append(...children)
	return element
}

describe('StyleEmbedder', () => {
	let container: HTMLElement

	beforeEach(() => {
		keysCalls = 0
		;(Element.prototype as any).computedStyleMap = fakeComputedStyleMap
		// jsdom can't compute pseudo-element styles; report that they have no content
		const getComputedStyle = window.getComputedStyle.bind(window)
		vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
			pseudo ? ({ getPropertyValue: () => '' } as any) : getComputedStyle(element)
		)
		container = document.createElement('div')
		document.body.appendChild(container)
	})

	afterEach(() => {
		delete (Element.prototype as any).computedStyleMap
		vi.restoreAllMocks()
		container.remove()
	})

	function embed(roots: Element[], { detached = [] as Element[] } = {}) {
		container.append(...roots)
		const embedder = new StyleEmbedder(container)
		try {
			for (const root of [...detached, ...roots]) embedder.readRootElementStyles(root)
			embedder.embedStyles()
		} finally {
			embedder.dispose()
		}
	}

	it('lists the properties once per export and reads every one of them from each element', () => {
		const child = el('span', {
			color: 'rgb(1, 2, 3)',
			'margin-top': '7px',
			'padding-left': '8px',
			'--tl-b': '2',
		})
		const root = el(
			'div',
			{ color: 'rgb(4, 5, 6)', 'margin-top': '3px', 'padding-left': '9px', '--tl-a': '1' },
			[child]
		)
		const otherRoot = el('div', {
			color: 'rgb(7, 8, 9)',
			'margin-top': '1px',
			'padding-left': '5px',
		})

		embed([root, otherRoot])

		expect(keysCalls).toBe(1)
		expect(root.getAttribute('style')).toBe(
			'color: rgb(4, 5, 6); margin-top: 3px; padding-left: 9px;'
		)
		expect(child.getAttribute('style')).toBe(
			'color: rgb(1, 2, 3); margin-top: 7px; padding-left: 8px;'
		)
		expect(otherRoot.getAttribute('style')).toBe(
			'color: rgb(7, 8, 9); margin-top: 1px; padding-left: 5px;'
		)

		// a new export lists them again, so nothing carries over between exports
		embed([el('div', { color: 'rgb(1, 1, 1)', 'margin-top': '0px', 'padding-left': '0px' })])
		expect(keysCalls).toBe(2)
	})

	it('still styles every element when the first one read is detached', () => {
		// e.g. embedMedia replaced a root <canvas> with an <img> before styles were read
		const detached = el('canvas', { color: 'rgb(1, 2, 3)' })
		const root = el('div', { color: 'rgb(4, 5, 6)', 'margin-top': '3px', 'padding-left': '9px' })

		embed([root], { detached: [detached] })

		expect(root.getAttribute('style')).toBe(
			'color: rgb(4, 5, 6); margin-top: 3px; padding-left: 9px;'
		)
	})

	it('skips a property that an element has no value for', () => {
		const root = el('div', { color: 'rgb(4, 5, 6)', 'margin-top': '3px', 'padding-left': '9px' })
		const sparse = el('div', { 'padding-left': '2px' })

		expect(() => embed([root, sparse])).not.toThrow()
		expect(sparse.getAttribute('style')).toBe('padding-left: 2px;')
	})
})
