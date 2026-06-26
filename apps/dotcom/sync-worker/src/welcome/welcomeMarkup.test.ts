import { describe, expect, it } from 'vitest'
import { inlineContentFromMessage, messageFromRichText, WelcomeRichText } from './welcomeMarkup'

const doc = (content: WelcomeRichText['content'][number]['content']): WelcomeRichText => ({
	type: 'doc',
	content: [{ type: 'paragraph', content }],
})

describe('messageFromRichText', () => {
	it('serializes plain text', () => {
		expect(messageFromRichText(doc([{ type: 'text', text: 'Welcome' }]))).toBe('Welcome')
	})

	it('wraps bold runs in <strong>', () => {
		const rt = doc([
			{ type: 'text', text: 'A workspace is a ' },
			{ type: 'text', text: 'shared space', marks: [{ type: 'bold' }] },
			{ type: 'text', text: ' for your team.' },
		])
		expect(messageFromRichText(rt)).toBe(
			'A workspace is a <strong>shared space</strong> for your team.'
		)
	})

	it('wraps bold+highlight runs in <mark><strong> (highlight outermost)', () => {
		const rt = doc([
			{ type: 'text', text: 'A workspace is a ' },
			{ type: 'text', text: 'shared space', marks: [{ type: 'bold' }, { type: 'highlight' }] },
			{ type: 'text', text: ' for your team.' },
		])
		expect(messageFromRichText(rt)).toBe(
			'A workspace is a <mark><strong>shared space</strong></mark> for your team.'
		)
	})

	it('wraps highlight-only runs in <mark>', () => {
		const rt = doc([{ type: 'text', text: 'note', marks: [{ type: 'highlight' }] }])
		expect(messageFromRichText(rt)).toBe('<mark>note</mark>')
	})
})

describe('inlineContentFromMessage', () => {
	it('parses plain text to a single node', () => {
		expect(inlineContentFromMessage('Welcome')).toEqual([{ type: 'text', text: 'Welcome' }])
	})

	it('parses <strong> runs to bold-marked nodes and drops empty runs', () => {
		expect(inlineContentFromMessage('<strong>Invite</strong> your team')).toEqual([
			{ type: 'text', text: 'Invite', marks: [{ type: 'bold' }] },
			{ type: 'text', text: ' your team' },
		])
	})

	it('parses nested <mark><strong> to a run with both marks', () => {
		expect(inlineContentFromMessage('a <mark><strong>b</strong></mark> c')).toEqual([
			{ type: 'text', text: 'a ' },
			{ type: 'text', text: 'b', marks: [{ type: 'highlight' }, { type: 'bold' }] },
			{ type: 'text', text: ' c' },
		])
	})

	it('parses highlight-only <mark> runs', () => {
		expect(inlineContentFromMessage('<mark>note</mark>')).toEqual([
			{ type: 'text', text: 'note', marks: [{ type: 'highlight' }] },
		])
	})
})

describe('round trip', () => {
	it('message → nodes → message is stable for bold and plain runs', () => {
		const message = 'You can <strong>move files</strong> with the menu.'
		const rt = doc(inlineContentFromMessage(message))
		expect(messageFromRichText(rt)).toBe(message)
	})

	it('message → nodes → message is stable for nested bold+highlight', () => {
		const message = 'A workspace is a <mark><strong>shared space</strong></mark> for your team.'
		const rt = doc(inlineContentFromMessage(message))
		expect(messageFromRichText(rt)).toBe(message)
	})
})
