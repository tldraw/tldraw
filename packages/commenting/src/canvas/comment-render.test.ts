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
