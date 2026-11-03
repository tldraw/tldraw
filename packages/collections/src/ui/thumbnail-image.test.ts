import { sanitizeSvg } from 'tldraw'
import { prepareThumbnailSvg } from './thumbnail-image'

const svg = (body: string, attrs = '') =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"${attrs}>${body}</svg>`
const passThrough = (markup: string) => markup

describe('prepareThumbnailSvg', () => {
	it('keeps what a preview needs: colour variables and labels', () => {
		const result = prepareThumbnailSvg(
			svg(
				'<rect fill="var(--tl-preview-blue-solid, #4465e9)"/>' +
					'<foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml" style="color: var(--tl-preview-text, #000)">Hi</div></foreignObject>'
			),
			sanitizeSvg
		)
		expect(result?.querySelector('rect')?.getAttribute('fill')).toBe(
			'var(--tl-preview-blue-solid, #4465e9)'
		)
		expect(result?.querySelector('foreignObject')?.textContent).toBe('Hi')
	})

	it('drops the size so the tile decides it', () => {
		const result = prepareThumbnailSvg(svg('<rect/>'), sanitizeSvg)
		expect(result?.hasAttribute('width')).toBe(false)
		expect(result?.hasAttribute('height')).toBe(false)
	})

	it('cleans script out with the default sanitiser', () => {
		const result = prepareThumbnailSvg(
			svg('<script>alert(1)</script><rect/>', ' onload="alert(1)"'),
			sanitizeSvg
		)
		expect(result).not.toBeNull()
		expect(result?.querySelector('script')).toBeNull()
		expect(result?.hasAttribute('onload')).toBe(false)
	})

	it.each([
		['a script element', svg('<script>alert(1)</script>')],
		['an event handler', svg('<rect/>', ' onload="alert(1)"')],
		['a javascript: link', svg('<a href="javascript:alert(1)"><rect/></a>')],
		['a javascript: link split by a tab', svg('<a href="java&#x09;script:alert(1)"><rect/></a>')],
		[
			'an animation that sets a link',
			svg('<a><set attributeName="href" to="javascript:alert(1)"/></a>'),
		],
		[
			'an iframe in a label',
			svg(
				'<foreignObject><iframe xmlns="http://www.w3.org/1999/xhtml" src="https://example.com"/></foreignObject>'
			),
		],
	])('refuses %s that a weak sanitiser lets through', (_, markup) => {
		expect(prepareThumbnailSvg(markup, passThrough)).toBeNull()
	})

	it('refuses what is not an SVG', () => {
		expect(prepareThumbnailSvg('<html><body>hi</body></html>', passThrough)).toBeNull()
		expect(prepareThumbnailSvg('<svg', passThrough)).toBeNull()
	})

	it('refuses a thumbnail the sanitiser rejects or fails on', () => {
		expect(prepareThumbnailSvg(svg('<rect/>'), () => '')).toBeNull()
		expect(
			prepareThumbnailSvg(svg('<rect/>'), () => {
				throw new Error('nope')
			})
		).toBeNull()
	})

	it('refuses a very large thumbnail before sanitising it', () => {
		const sanitize = vi.fn(passThrough)
		expect(prepareThumbnailSvg(svg(`<desc>${'x'.repeat(1_000_001)}</desc>`), sanitize)).toBeNull()
		expect(sanitize).not.toHaveBeenCalled()
	})
})
