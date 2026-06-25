import { RoomSnapshot } from '@tldraw/sync-core'
import { describe, expect, it } from 'vitest'
import { injectWelcomeCopy } from './injectWelcomeCopy'
import { WelcomeRichText } from './welcomeMarkup'

const richText = (text: string): WelcomeRichText => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

function snapshot(): RoomSnapshot {
	return {
		documentClock: 0,
		tombstoneHistoryStartsAtClock: 0,
		schema: {} as any,
		documents: [
			{
				state: { id: 'shape:a', props: { richText: richText('Hello'), color: 'black' } } as any,
				lastChangedClock: 0,
			},
			{
				state: { id: 'shape:b', props: { richText: richText('World') } } as any,
				lastChangedClock: 0,
			},
		],
	}
}

describe('injectWelcomeCopy', () => {
	it('replaces richText on mapped shapes and leaves others untouched', () => {
		const result = injectWelcomeCopy(snapshot(), { 'shape:a': richText('Bonjour') })
		const [a, b] = result.documents
		expect((a.state as any).props.richText).toEqual(richText('Bonjour'))
		// other props on the mapped shape survive
		expect((a.state as any).props.color).toBe('black')
		// unmapped shape is unchanged
		expect((b.state as any).props.richText).toEqual(richText('World'))
	})

	it('does not mutate the input snapshot', () => {
		const input = snapshot()
		injectWelcomeCopy(input, { 'shape:a': richText('Bonjour') })
		expect((input.documents[0].state as any).props.richText).toEqual(richText('Hello'))
	})

	it('ignores shape ids that are not in the snapshot', () => {
		const result = injectWelcomeCopy(snapshot(), { 'shape:missing': richText('x') })
		expect(result.documents.map((d) => (d.state as any).props.richText)).toEqual([
			richText('Hello'),
			richText('World'),
		])
	})
})
