import { generateHTML } from '@tiptap/core'
import { getTipTapDefaultExtensions } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { createMentionExtension } from './mention-extension'

// The exact render path shape text uses: tldraw's default rich-text extensions plus the mention
// node, run through TipTap's `generateHTML` (what `renderHtmlFromRichText` does under the hood).
const render = (body: any, resolveName?: (id: string) => string | undefined) =>
	generateHTML(body, [...getTipTapDefaultExtensions(), createMentionExtension({ resolveName })])

const doc = (...content: any[]) => ({ type: 'doc', content }) as any
const para = (...content: any[]) => ({ type: 'paragraph', content })
const text = (value: string) => ({ type: 'text', text: value })
const mention = (id: string, label?: string) => ({ type: 'mention', attrs: { id, label } })

describe('createMentionExtension', () => {
	it('renders a mention node as a pill carrying its member id', () => {
		const html = render(doc(para(text('hi '), mention('ada', 'Ada'))))
		expect(html).toContain('tlui-cmt-mention')
		expect(html).toContain('data-mention-id="ada"')
	})

	it('resolves the id to the current name, not the label frozen at insert time', () => {
		const html = render(doc(para(mention('ada', 'Ada'))), (id) =>
			id === 'ada' ? 'Ada Lovelace' : undefined
		)
		expect(html).toContain('@Ada Lovelace')
		expect(html).not.toContain('@Ada<')
	})

	it('falls back to the stored label when the id can not be resolved', () => {
		const html = render(doc(para(mention('ghost', 'Ada'))), () => undefined)
		expect(html).toContain('@Ada')
	})

	it('escapes a resolved name so it can never inject markup', () => {
		const html = render(doc(para(mention('ada'))), () => '<img src=x onerror=alert(1)>')
		expect(html).not.toContain('<img')
		expect(html).toContain('&lt;img')
	})
})
