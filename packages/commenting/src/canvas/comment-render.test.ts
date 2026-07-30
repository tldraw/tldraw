import { describe, expect, it } from 'vitest'
import { EMPTY_COMMENT, isCommentEmpty } from '../ui/comment-extensions'
import { renderCommentHtml, renderCommentPlaintext } from './comment-render'

const doc = (...content: any[]) => ({ type: 'doc', content }) as any
const para = (...content: any[]) => ({ type: 'paragraph', content })
const text = (value: string, marks?: any[]) => ({
	type: 'text',
	text: value,
	...(marks ? { marks } : {}),
})
const mention = (id: string, label?: string) => ({ type: 'mention', attrs: { id, label } })

describe('renderCommentHtml', () => {
	it('preserves bold, links, and lists from the limited set', () => {
		const html = renderCommentHtml(doc(para(text('hi', [{ type: 'bold' }]))))
		expect(html).toContain('<strong>hi</strong>')

		const list = renderCommentHtml(
			doc({
				type: 'bulletList',
				content: [{ type: 'listItem', content: [para(text('one'))] }],
			})
		)
		expect(list).toContain('<ul')
		expect(list).toContain('one')
	})

	it('renders a heading node as a paragraph, never a heading', () => {
		const html = renderCommentHtml(
			doc({ type: 'heading', attrs: { level: 1 }, content: [text('Title')] })
		)
		expect(html).not.toMatch(/<h[1-6]/)
		expect(html).toContain('<p')
		expect(html).toContain('Title')
	})

	it('renders a mention as a pill and resolves its id to the current name', () => {
		const body = doc(para(text('hey '), mention('u1', 'Ada')))
		const html = renderCommentHtml(body, (id) => (id === 'u1' ? 'Ada Lovelace' : '?'))
		expect(html).toContain('tlui-cmt-mention')
		// the live name from the resolver, not the label stored at insert time
		expect(html).toContain('@Ada Lovelace')
		expect(html).not.toContain('@Ada<')
	})

	it('falls back to the stored label when no resolver is given', () => {
		const html = renderCommentHtml(doc(para(mention('u1', 'Ada'))))
		expect(html).toContain('@Ada')
	})

	it('escapes a resolved name, so it can never inject markup', () => {
		const html = renderCommentHtml(doc(para(mention('u1'))), () => '<img src=x onerror=alert(1)>')
		expect(html).not.toContain('<img')
		expect(html).toContain('&lt;img')
	})
})

describe('renderCommentPlaintext', () => {
	it('flattens paragraphs and demotes headings without throwing', () => {
		const flat = renderCommentPlaintext(
			doc({ type: 'heading', attrs: { level: 2 }, content: [text('Title')] }, para(text('body')))
		)
		expect(flat).toBe('Title\nbody')
	})

	it('returns an empty string for an empty body', () => {
		expect(renderCommentPlaintext(EMPTY_COMMENT)).toBe('')
	})

	it('renders a mention as @name, resolved to the current name', () => {
		const result = renderCommentPlaintext(
			doc(para(text('hi '), mention('u1', 'Ada'))),
			() => 'Ada Lovelace'
		)
		expect(result).toBe('hi @Ada Lovelace')
	})
})

describe('isCommentEmpty', () => {
	it('treats the empty seed and empty encodings as empty', () => {
		expect(isCommentEmpty(EMPTY_COMMENT)).toBe(true)
		expect(isCommentEmpty(doc())).toBe(true)
		expect(isCommentEmpty(doc(para()))).toBe(true)
	})

	it('treats a body with text as non-empty', () => {
		expect(isCommentEmpty(doc(para(text('hi'))))).toBe(false)
	})
})
