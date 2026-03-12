import { createShapeId, toRichText } from '@tldraw/editor'
import { describe, expect, it, vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { sanitizeSvg } from './sanitizeSvg'

function wrap(inner: string, attrs = 'xmlns="http://www.w3.org/2000/svg"'): string {
	return `<svg ${attrs}>${inner}</svg>`
}

describe('sanitizeSvg', () => {
	describe('attack vectors — must strip', () => {
		it('removes <script> elements', () => {
			const result = sanitizeSvg(wrap('<script>alert(1)</script><rect width="10" height="10"/>'))
			expect(result).not.toContain('<script')
			expect(result).toContain('<rect')
		})

		it('strips onerror from <image>', () => {
			const result = sanitizeSvg(wrap('<image onerror="alert(1)" href="data:image/png;base64,x"/>'))
			expect(result).not.toContain('onerror')
			expect(result).toContain('<image')
		})

		it('removes <img> inside <foreignObject>', () => {
			const result = sanitizeSvg(
				wrap(
					'<foreignObject width="100" height="100"><img onerror="alert(1)" src="x"/></foreignObject>'
				)
			)
			expect(result).not.toContain('<img')
			expect(result).toContain('foreignObject')
		})

		it('strips onload from <svg>', () => {
			const result = sanitizeSvg(
				'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>'
			)
			expect(result).not.toContain('onload')
			expect(result).toContain('<rect')
		})

		it('strips onclick from <rect>', () => {
			const result = sanitizeSvg(wrap('<rect onclick="alert(1)" width="10" height="10"/>'))
			expect(result).not.toContain('onclick')
		})

		it('strips onbegin from <animate>', () => {
			const result = sanitizeSvg(
				wrap('<animate onbegin="alert(1)" attributeName="x" from="0" to="100" dur="1s"/>')
			)
			expect(result).not.toContain('onbegin')
			expect(result).toContain('<animate')
		})

		it('strips javascript: href from <a>', () => {
			const result = sanitizeSvg(wrap('<a href="javascript:alert(1)"><text>click</text></a>'))
			expect(result).not.toContain('javascript')
		})

		it('strips https: href from <image>', () => {
			const result = sanitizeSvg(
				wrap('<image href="https://evil.com/x.png" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips https: xlink:href from <image>', () => {
			const result = sanitizeSvg(
				wrap(
					'<image xlink:href="https://evil.com/x.png" width="10" height="10"/>',
					'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
				)
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external href from <use>', () => {
			const result = sanitizeSvg(wrap('<use href="https://evil.com/x.svg#y"/>'))
			expect(result).not.toContain('evil.com')
		})

		it('strips data: href from <use>', () => {
			const result = sanitizeSvg(wrap('<use href="data:image/svg+xml,&lt;svg&gt;&lt;/svg&gt;"/>'))
			expect(result).not.toContain('data:')
		})

		it('strips external href from <feImage>', () => {
			const result = sanitizeSvg(
				wrap('<filter id="f"><feImage href="https://evil.com/x.png"/></filter>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips @import in <style>', () => {
			const result = sanitizeSvg(
				wrap('<style>@import url("https://evil.com/x.css");</style><rect width="10" height="10"/>')
			)
			expect(result).not.toContain('@import')
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in <style>', () => {
			const result = sanitizeSvg(
				wrap(
					'<style>rect { background: url(https://evil.com/x.png) }</style><rect width="10" height="10"/>'
				)
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in @font-face in <style>', () => {
			const result = sanitizeSvg(
				wrap(
					'<style>@font-face { src: url(https://evil.com/font.woff2) }</style><rect width="10" height="10"/>'
				)
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in style attribute', () => {
			const result = sanitizeSvg(
				wrap('<rect style="background: url(https://evil.com/x)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips cursor url() in style attribute', () => {
			const result = sanitizeSvg(
				wrap('<rect style="cursor: url(https://evil.com/c)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('blocks CSS escape bypass in href', () => {
			// \6A decodes to 'j', making "javascript:"
			const result = sanitizeSvg(wrap('<a href="\\6Aavascript:alert(1)"><text>x</text></a>'))
			// The href might still be there but it shouldn't contain javascript protocol
			// Since this is an SVG a element, it uses URI sanitization which strips invisible whitespace
			// and checks protocol
			expect(result).not.toContain('alert')
		})

		it('blocks null byte bypass in href', () => {
			const result = sanitizeSvg(wrap('<a href="java\x00script:alert(1)"><text>x</text></a>'))
			expect(result).not.toContain('alert')
		})

		it('strips mixed-case event handlers', () => {
			const r1 = sanitizeSvg(wrap('<rect OnError="alert(1)" width="10" height="10"/>'))
			expect(r1).not.toContain('OnError')

			const r2 = sanitizeSvg(wrap('<rect ONCLICK="alert(1)" width="10" height="10"/>'))
			expect(r2).not.toContain('ONCLICK')
		})

		it('removes <iframe> inside <foreignObject>', () => {
			const result = sanitizeSvg(
				wrap(
					'<foreignObject width="100" height="100"><iframe src="https://evil.com"></iframe></foreignObject>'
				)
			)
			expect(result).not.toContain('<iframe')
		})

		it('removes <embed> inside <foreignObject>', () => {
			const result = sanitizeSvg(
				wrap(
					'<foreignObject width="100" height="100"><embed src="https://evil.com"/></foreignObject>'
				)
			)
			expect(result).not.toContain('<embed')
		})

		it('removes <object> inside <foreignObject>', () => {
			const result = sanitizeSvg(
				wrap(
					'<foreignObject width="100" height="100"><object data="https://evil.com"></object></foreignObject>'
				)
			)
			expect(result).not.toContain('<object')
		})

		it('removes <form> inside <foreignObject>', () => {
			const result = sanitizeSvg(
				wrap(
					'<foreignObject width="100" height="100"><form action="https://evil.com"><input/></form></foreignObject>'
				)
			)
			expect(result).not.toContain('<form')
		})

		it('removes nested <svg> inside <foreignObject>', () => {
			const result = sanitizeSvg(
				wrap(
					'<foreignObject width="100" height="100"><svg><script>alert(1)</script></svg></foreignObject>'
				)
			)
			// The nested svg should be removed; the foreignObject is preserved
			expect(result).toContain('foreignObject')
			expect(result).not.toContain('<script')
			// Check there's no nested svg — only the outer one
			const svgCount = (result.match(/<svg/g) || []).length
			expect(svgCount).toBe(1)
		})

		it('removes <link> inside <foreignObject>', () => {
			const result = sanitizeSvg(
				wrap(
					'<foreignObject width="100" height="100"><link href="https://evil.com/x.css" rel="stylesheet"/></foreignObject>'
				)
			)
			expect(result).not.toContain('<link')
		})

		it('strips expression() in CSS', () => {
			const result = sanitizeSvg(
				wrap('<rect style="width: expression(alert(1))" width="10" height="10"/>')
			)
			expect(result).not.toContain('expression')
			expect(result).not.toContain('alert')
		})

		it('strips -moz-binding in CSS', () => {
			const result = sanitizeSvg(
				wrap('<rect style="-moz-binding: url(x)" width="10" height="10"/>')
			)
			expect(result).not.toContain('-moz-binding')
		})

		it('strips behavior: in CSS', () => {
			const result = sanitizeSvg(
				wrap('<rect style="behavior: url(x.htc)" width="10" height="10"/>')
			)
			expect(result).not.toContain('behavior')
		})

		it('returns empty string for fully malicious SVG', () => {
			const result = sanitizeSvg(wrap('<script>alert(1)</script>'))
			expect(result).toBe('')
		})

		it('returns empty string for invalid SVG', () => {
			const result = sanitizeSvg('this is not svg')
			expect(result).toBe('')
		})

		it('rejects non-svg root element', () => {
			const result = sanitizeSvg(
				'<script xmlns="http://www.w3.org/2000/svg">alert(1)<rect width="10" height="10"/></script>'
			)
			expect(result).toBe('')
		})

		it('removes <animate> targeting href (XSS via animation)', () => {
			const result = sanitizeSvg(
				wrap(
					'<a href="https://safe.com"><animate attributeName="href" values="javascript:alert(1)" dur="1s"/><text>x</text></a>'
				)
			)
			expect(result).not.toContain('javascript')
			expect(result).not.toContain('attributeName="href"')
			expect(result).toContain('<text')
		})

		it('removes <set> targeting href', () => {
			const result = sanitizeSvg(
				wrap(
					'<a href="https://safe.com"><set attributeName="href" to="javascript:alert(1)"/><text>x</text></a>'
				)
			)
			expect(result).not.toContain('javascript')
			expect(result).not.toContain('attributeName="href"')
		})

		it('removes <animateTransform> targeting href', () => {
			const result = sanitizeSvg(
				wrap(
					'<a href="https://safe.com"><animateTransform attributeName="href" values="javascript:alert(1)"/><text>x</text></a>'
				)
			)
			expect(result).not.toContain('attributeName="href"')
		})

		it('removes <animate> targeting xlink:href', () => {
			const result = sanitizeSvg(
				wrap(
					'<a href="https://safe.com"><animate attributeName="xlink:href" values="javascript:alert(1)"/><text>x</text></a>',
					'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'
				)
			)
			expect(result).not.toContain('attributeName="xlink:href"')
		})

		it('removes <animate> targeting on* attributes', () => {
			const result = sanitizeSvg(
				wrap(
					'<rect width="10" height="10"><animate attributeName="onclick" values="alert(1)" dur="1s"/></rect>'
				)
			)
			expect(result).not.toContain('attributeName="onclick"')
		})

		it('strips multiline CSS url() values', () => {
			const result = sanitizeSvg(
				wrap(
					'<style>rect { background: url(\nhttps://evil.com/x.png\n) }</style><rect width="10" height="10"/>'
				)
			)
			expect(result).not.toContain('evil.com')
		})

		it('blocks fully-malicious data:image/svg+xml on <image>', () => {
			// inner SVG has no safe content after sanitization, so href is removed
			const result = sanitizeSvg(
				wrap(
					'<image href="data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KDEpPC9zY3JpcHQ+PC9zdmc+" width="10" height="10"/>'
				)
			)
			expect(result).not.toContain('data:image/svg+xml')
		})

		it('blocks data:image/svg+xml in CSS url()', () => {
			const result = sanitizeSvg(
				wrap(
					'<style>rect { background: url(data:image/svg+xml;base64,PHN2Zz4=) }</style><rect width="10" height="10"/>'
				)
			)
			expect(result).not.toContain('data:image/svg+xml')
		})

		it('strips @import with semicolons inside quoted URL', () => {
			const result = sanitizeSvg(
				wrap(
					'<style>@import url("https://evil.com/foo;bar.css");</style><rect width="10" height="10"/>'
				)
			)
			expect(result).not.toContain('evil.com')
			expect(result).not.toContain('@import')
		})

		it('strips external url() in fill attribute', () => {
			const result = sanitizeSvg(
				wrap('<rect fill="url(https://evil.com/track.png)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in filter attribute', () => {
			const result = sanitizeSvg(
				wrap('<rect filter="url(https://evil.com/filter)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in clip-path attribute', () => {
			const result = sanitizeSvg(
				wrap('<rect clip-path="url(https://evil.com/clip)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in mask attribute', () => {
			const result = sanitizeSvg(
				wrap('<rect mask="url(https://evil.com/mask)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in marker-end attribute', () => {
			const result = sanitizeSvg(
				wrap('<line marker-end="url(https://evil.com/m)" x1="0" y1="0" x2="10" y2="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips external url() in stroke attribute', () => {
			const result = sanitizeSvg(
				wrap('<rect stroke="url(https://evil.com/s)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('strips uppercase URL() in presentation attributes', () => {
			const result = sanitizeSvg(
				wrap('<rect fill="URL(https://evil.com/track)" width="10" height="10"/>')
			)
			expect(result).not.toContain('evil.com')
		})

		it('does not throw on CSS escapes above Unicode max', () => {
			const result = sanitizeSvg(wrap('<rect style="color: \\999999" width="10" height="10"/>'))
			expect(result).toContain('<rect')
		})
	})

	describe('preservation — must keep intact', () => {
		it('preserves basic SVG shapes', () => {
			const svg = wrap(
				'<path d="M0 0L10 10"/><rect width="10" height="10"/><circle cx="5" cy="5" r="5"/>' +
					'<ellipse cx="5" cy="5" rx="5" ry="3"/><line x1="0" y1="0" x2="10" y2="10"/>' +
					'<polyline points="0,0 10,10 20,0"/><polygon points="0,0 10,10 20,0"/>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('<path')
			expect(result).toContain('<rect')
			expect(result).toContain('<circle')
			expect(result).toContain('<ellipse')
			expect(result).toContain('<line')
			expect(result).toContain('<polyline')
			expect(result).toContain('<polygon')
		})

		it('preserves gradients', () => {
			const svg = wrap(
				'<defs><linearGradient id="lg"><stop offset="0" stop-color="red"/></linearGradient>' +
					'<radialGradient id="rg"><stop offset="0" stop-color="blue"/></radialGradient></defs>' +
					'<rect fill="url(#lg)" width="10" height="10"/>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('linearGradient')
			expect(result).toContain('radialGradient')
			expect(result).toContain('<stop')
			// fill="url(#lg)" must survive url-bearing attr sanitization
			expect(result).toContain('url(#lg)')
		})

		it('preserves filters', () => {
			const svg = wrap(
				'<defs><filter id="f"><feGaussianBlur stdDeviation="2"/>' +
					'<feDropShadow dx="2" dy="2"/><feBlend mode="multiply"/></filter></defs>' +
					'<rect filter="url(#f)" width="10" height="10"/>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('feGaussianBlur')
			expect(result).toContain('feDropShadow')
			expect(result).toContain('feBlend')
			// filter="url(#f)" must survive url-bearing attr sanitization
			expect(result).toContain('url(#f)')
		})

		it('preserves clipPath, mask, pattern, marker', () => {
			const svg = wrap(
				'<defs><clipPath id="cp"><rect width="10" height="10"/></clipPath>' +
					'<mask id="m"><rect width="10" height="10" fill="white"/></mask>' +
					'<pattern id="p" width="10" height="10"><rect width="5" height="5"/></pattern>' +
					'<marker id="mk" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></marker></defs>' +
					'<rect width="10" height="10"/>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('clipPath')
			expect(result).toContain('mask')
			expect(result).toContain('pattern')
			expect(result).toContain('marker')
		})

		it('preserves data: href on <image>', () => {
			const svg = wrap('<image href="data:image/png;base64,iVBOR" width="10" height="10"/>')
			const result = sanitizeSvg(svg)
			expect(result).toContain('data:image/png;base64,iVBOR')
		})

		it('preserves safe data:image/svg+xml href on <image>', () => {
			// base64 of <svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>
			const innerSvg =
				'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
			const b64 = btoa(innerSvg)
			const svg = wrap(`<image href="data:image/svg+xml;base64,${b64}" width="10" height="10"/>`)
			const result = sanitizeSvg(svg)
			expect(result).toContain('data:image/svg+xml;base64,')
			expect(result).toContain('<image')
		})

		it('preserves safe content and strips script from embedded SVG data URI on <image>', () => {
			// SVG with both safe content and a script tag
			const innerSvg =
				'<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/><script>alert(1)</script></svg>'
			const b64 = btoa(innerSvg)
			const svg = wrap(`<image href="data:image/svg+xml;base64,${b64}" width="10" height="10"/>`)
			const result = sanitizeSvg(svg)
			// Should keep the image with sanitized SVG data URI
			expect(result).toContain('data:image/svg+xml;base64,')
			// Decode the embedded SVG to verify script was stripped
			const match = result.match(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/)
			expect(match).toBeTruthy()
			const decoded = atob(match![1])
			expect(decoded).toContain('<rect')
			expect(decoded).not.toContain('<script')
		})

		it('preserves fragment ref on <use>', () => {
			const svg = wrap('<defs><rect id="r" width="10" height="10"/></defs><use href="#r"/>')
			const result = sanitizeSvg(svg)
			expect(result).toContain('href="#r"')
		})

		it('preserves data: font URL in <style>', () => {
			const svg = wrap(
				'<style>@font-face { font-family: "Test"; src: url(data:font/woff2;base64,d09GMg) }</style>' +
					'<rect width="10" height="10"/>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('data:font/woff2;base64,d09GMg')
		})

		it('preserves foreignObject with safe HTML content', () => {
			const svg = wrap(
				'<foreignObject width="100" height="100">' +
					'<div xmlns="http://www.w3.org/1999/xhtml"><p>Hello <strong>world</strong></p>' +
					'<span class="test">text</span>' +
					'<ul><li>item</li></ul>' +
					'<code>code</code><em>italic</em><b>bold</b>' +
					'</div></foreignObject>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('foreignObject')
			expect(result).toContain('<div')
			expect(result).toContain('<p')
			expect(result).toContain('<strong')
			expect(result).toContain('<span')
			expect(result).toContain('<ul')
			expect(result).toContain('<li')
			expect(result).toContain('<code')
			expect(result).toContain('<em')
			expect(result).toContain('<b')
			expect(result).toContain('Hello')
		})

		it('preserves https link in <a>', () => {
			const svg = wrap('<a href="https://example.com"><text>link</text></a>')
			const result = sanitizeSvg(svg)
			expect(result).toContain('https://example.com')
		})

		it('preserves https link in <a> inside foreignObject', () => {
			const svg = wrap(
				'<foreignObject width="100" height="100">' +
					'<div xmlns="http://www.w3.org/1999/xhtml"><a href="https://example.com">link</a></div>' +
					'</foreignObject>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('https://example.com')
		})

		it('preserves safe inline styles', () => {
			const svg = wrap('<rect style="fill: red; stroke: blue;" width="10" height="10"/>')
			const result = sanitizeSvg(svg)
			expect(result).toContain('fill: red')
			expect(result).toContain('stroke: blue')
		})

		it('preserves transform, viewBox, preserveAspectRatio', () => {
			const svg =
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="translate(10,10)"><rect width="10" height="10"/></g></svg>'
			const result = sanitizeSvg(svg)
			expect(result).toContain('viewBox')
			expect(result).toContain('transform')
		})

		it('preserves data-* and aria-* attributes', () => {
			const svg = wrap('<rect data-testid="r" aria-label="rectangle" width="10" height="10"/>')
			const result = sanitizeSvg(svg)
			expect(result).toContain('data-testid')
			expect(result).toContain('aria-label')
		})

		it('preserves width/height on svg element', () => {
			const svg =
				'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="10" height="10"/></svg>'
			const result = sanitizeSvg(svg)
			expect(result).toContain('width="200"')
			expect(result).toContain('height="100"')
		})

		it('preserves animation elements without event handlers', () => {
			const svg = wrap(
				'<rect width="10" height="10"><animate attributeName="x" from="0" to="100" dur="1s"/>' +
					'<set attributeName="fill" to="red"/>' +
					'<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="1s"/></rect>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('<animate')
			expect(result).toContain('<set')
			expect(result).toContain('animateTransform')
		})

		it('preserves CSS url(#id) fragment references in <style>', () => {
			const svg = wrap(
				'<defs><linearGradient id="grad"><stop offset="0" stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs>' +
					'<style>rect { fill: url(#grad) }</style>' +
					'<rect width="10" height="10"/>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('url(#grad)')
		})

		it('preserves safe <animate> targeting non-URI attributes', () => {
			const svg = wrap(
				'<rect width="10" height="10">' +
					'<animate attributeName="opacity" from="0" to="1" dur="1s"/>' +
					'<animate attributeName="fill" from="red" to="blue" dur="1s"/>' +
					'</rect>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('attributeName="opacity"')
			expect(result).toContain('attributeName="fill"')
		})

		it('preserves data: image in CSS url()', () => {
			const svg = wrap(
				'<style>rect { background-image: url(data:image/png;base64,iVBOR) }</style>' +
					'<rect width="10" height="10"/>'
			)
			const result = sanitizeSvg(svg)
			expect(result).toContain('data:image/png;base64,iVBOR')
		})
	})

	describe('round-trip — tldraw SVG export survives sanitization', () => {
		vi.useRealTimers()

		it('preserves tldraw-exported SVG with text shapes', async () => {
			const editor = new TestEditor()
			const geoId = createShapeId('geo')

			editor.createShapes([
				{
					id: geoId,
					type: 'geo',
					x: 0,
					y: 0,
					props: {
						w: 200,
						h: 100,
						richText: toRichText('Hello world'),
					},
				},
			])
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()

			const original = exported!.svg
			const sanitized = sanitizeSvg(original)

			// Must not be empty
			expect(sanitized).not.toBe('')
			// Must still contain the SVG root
			expect(sanitized).toContain('<svg')
			// Must preserve text content
			expect(sanitized).toContain('Hello world')
			// Must preserve foreignObject (used for text rendering)
			expect(sanitized).toContain('foreignObject')
			// Must preserve path elements (shape outlines)
			expect(sanitized).toContain('<path')
			// Must preserve style elements (for fonts)
			if (original.includes('<style')) {
				expect(sanitized).toContain('<style')
			}
			// If original has data: font URLs, they must survive
			if (original.includes('data:font/') || original.includes('data:application/')) {
				expect(sanitized).toMatch(/data:(?:font\/|application\/)/)
			}
		})

		it('preserves tldraw-exported SVG with multiple geo shapes', async () => {
			const editor = new TestEditor()
			editor.createShapes([
				{
					id: createShapeId('rect'),
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, geo: 'rectangle' },
				},
				{
					id: createShapeId('ellipse'),
					type: 'geo',
					x: 150,
					y: 0,
					props: { w: 100, h: 100, geo: 'ellipse' },
				},
			])
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()

			const sanitized = sanitizeSvg(exported!.svg)
			expect(sanitized).not.toBe('')
			expect(sanitized).toContain('<svg')

			// Parse both and compare child element counts
			const parser = new DOMParser()
			const origDoc = parser.parseFromString(exported!.svg, 'image/svg+xml')
			const sanDoc = parser.parseFromString(sanitized, 'image/svg+xml')

			const origSvg = origDoc.documentElement
			const sanSvg = sanDoc.documentElement

			// Sanitized SVG should have the same number of top-level children
			expect(sanSvg.children.length).toBe(origSvg.children.length)
		})

		it('preserves geo shape with pattern fill (mask + pattern defs)', async () => {
			const editor = new TestEditor()
			editor.createShapes([
				{
					id: createShapeId('patternRect'),
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 100, h: 100, fill: 'pattern' },
				},
			])
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()
			const original = exported!.svg
			const sanitized = sanitizeSvg(original)

			expect(sanitized).not.toBe('')
			// Pattern fill uses <mask>, <pattern>, <rect> in defs
			if (original.includes('<mask')) expect(sanitized).toContain('<mask')
			if (original.includes('<pattern')) expect(sanitized).toContain('<pattern')
			if (original.includes('<defs')) expect(sanitized).toContain('<defs')
		})

		it('preserves arrow shape with markers and clipPath', async () => {
			const editor = new TestEditor()
			const startId = createShapeId('start')
			const endId = createShapeId('end')
			editor.createShapes([
				{
					id: startId,
					type: 'geo',
					x: 0,
					y: 0,
					props: { w: 100, h: 100 },
				},
				{
					id: endId,
					type: 'geo',
					x: 300,
					y: 0,
					props: { w: 100, h: 100 },
				},
			])
			editor.setCurrentTool('arrow')
			editor.pointerDown(50, 50)
			editor.pointerMove(350, 50)
			editor.pointerUp()
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()
			const original = exported!.svg
			const sanitized = sanitizeSvg(original)

			expect(sanitized).not.toBe('')
			expect(sanitized).toContain('<path')
			// Arrows use marker and/or clipPath defs
			if (original.includes('<marker')) expect(sanitized).toContain('<marker')
			if (original.includes('<clipPath')) expect(sanitized).toContain('<clipPath')
		})

		it('preserves draw shape', async () => {
			const editor = new TestEditor()
			editor.setCurrentTool('draw')
			editor.pointerDown(0, 0)
			editor.pointerMove(50, 50)
			editor.pointerMove(100, 0)
			editor.pointerUp()
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()
			const sanitized = sanitizeSvg(exported!.svg)

			expect(sanitized).not.toBe('')
			expect(sanitized).toContain('<path')
		})

		it('preserves note shape with text', async () => {
			const editor = new TestEditor()
			editor.createShapes([
				{
					id: createShapeId('note'),
					type: 'note',
					x: 0,
					y: 0,
					props: {
						richText: toRichText('Note text'),
					},
				},
			])
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()
			const sanitized = sanitizeSvg(exported!.svg)

			expect(sanitized).not.toBe('')
			expect(sanitized).toContain('Note text')
		})

		it('preserves text shape', async () => {
			const editor = new TestEditor()
			editor.createShapes([
				{
					id: createShapeId('text'),
					type: 'text',
					x: 0,
					y: 0,
					props: {
						richText: toRichText('Plain text shape'),
						autoSize: true,
					},
				},
			])
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()
			const sanitized = sanitizeSvg(exported!.svg)

			expect(sanitized).not.toBe('')
			expect(sanitized).toContain('Plain text shape')
			expect(sanitized).toContain('foreignObject')
		})

		it('preserves highlight shape', async () => {
			const editor = new TestEditor()
			editor.setCurrentTool('highlight')
			editor.pointerDown(0, 0)
			editor.pointerMove(50, 50)
			editor.pointerMove(100, 0)
			editor.pointerUp()
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()
			const sanitized = sanitizeSvg(exported!.svg)

			expect(sanitized).not.toBe('')
			expect(sanitized).toContain('<path')
		})

		it('preserves line shape', async () => {
			const editor = new TestEditor()
			editor.setCurrentTool('line')
			editor.pointerDown(0, 0)
			editor.pointerMove(100, 100)
			editor.pointerUp()
			editor.selectAll()

			const exported = await editor.getSvgString(editor.getSelectedShapeIds())
			expect(exported).toBeTruthy()
			const sanitized = sanitizeSvg(exported!.svg)

			expect(sanitized).not.toBe('')
			expect(sanitized).toContain('<path')
		})
	})
})
