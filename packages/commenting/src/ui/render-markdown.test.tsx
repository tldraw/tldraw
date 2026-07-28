import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './render-markdown'

const html = (text: string) => renderToStaticMarkup(<>{renderMarkdown(text)}</>)

describe('renderMarkdown', () => {
	it('renders paragraphs, emphasis, code and lists', () => {
		expect(html('hello **world**')).toContain('<strong>world</strong>')
		expect(html('*em*')).toContain('<em>em</em>')
		expect(html('`code`')).toContain('class="md-code">code</code>')
		expect(html('- one\n- two')).toContain('<ul class="md-list">')
	})

	it('escapes html in comment text rather than rendering it', () => {
		const out = html('<img src=x onerror=alert(1)>')
		expect(out).not.toContain('<img')
		expect(out).toContain('&lt;img')
	})

	it('links http, https, mailto and tel targets', () => {
		expect(html('[a](https://example.com)')).toContain('href="https://example.com"')
		expect(html('[a](http://example.com)')).toContain('href="http://example.com"')
		expect(html('[a](mailto:x@example.com)')).toContain('href="mailto:x@example.com"')
		expect(html('[a](/relative/path)')).toContain('href="/relative/path"')
	})

	it('opens links in a new tab without leaking the referrer', () => {
		const out = html('[a](https://example.com)')
		expect(out).toContain('target="_blank"')
		expect(out).toContain('rel="noreferrer"')
	})

	// React does not block javascript: hrefs, so an unchecked target here is click-to-execute XSS
	// for any host rendering another user's comment body.
	it('refuses to link a javascript: target, keeping the label as text', () => {
		const out = html('[click me](javascript:alert(document.cookie))')
		expect(out).not.toContain('href')
		expect(out).not.toContain('javascript:')
		expect(out).toContain('click me')
	})

	it('refuses other script-capable and unknown schemes', () => {
		for (const url of ['JavaScript:alert(1)', 'data:text/html,<script>', 'vbscript:msgbox']) {
			const out = html(`[x](${url})`)
			expect(out, url).not.toContain('href')
			expect(out, url).toContain('x')
		}
	})

	// Browsers strip tab/LF/CR from a url and trim leading control characters before parsing, so
	// a scheme check on the raw string tests something the browser never resolves: `java\nscript:`
	// is not a scheme to a regex, but is `javascript:` by the time it's clicked.
	it('refuses a scheme smuggled past the check with control characters', () => {
		const smuggled = [
			'java\nscript:alert(1)',
			'java\tscript:alert(1)',
			'java\rscript:alert(1)',
			'\x00javascript:alert(1)',
			' \t javascript:alert(1)',
			'java\x01script:alert(1)',
		]
		for (const url of smuggled) {
			const out = html(`[x](${url})`)
			// no anchor at all: either the tokenizer never saw a link (a newline splits the block
			// before the link regex runs) or safeHref refused it. Either way there's nothing to
			// click — the leftover "script:" is escaped text content, which is inert.
			expect(out, JSON.stringify(url)).not.toContain('<a ')
			expect(out, JSON.stringify(url)).not.toContain('href')
		}
	})

	it('still links a normal url that merely has surrounding whitespace', () => {
		expect(html('[a]( https://example.com )')).toContain('href="https://example.com"')
	})
})
