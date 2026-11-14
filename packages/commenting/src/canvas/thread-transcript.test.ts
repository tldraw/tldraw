import { describe, expect, it } from 'vitest'
import { formatThreadTranscript, formatTranscriptTime } from './thread-transcript'

const doc = (...content: any[]) => ({ type: 'doc', content }) as any
const para = (...content: any[]) => ({ type: 'paragraph', content })
const text = (value: string) => ({ type: 'text', text: value })
const mention = (id: string, label?: string) => ({ type: 'mention', attrs: { id, label } })

const first = '2026-11-14T09:33:00.000Z'
const second = '2026-11-14T09:40:00.000Z'

describe('formatThreadTranscript', () => {
	it('puts each author and absolute time over the body, a blank line between comments', () => {
		const { text: plain } = formatThreadTranscript(
			[
				{ authorName: 'Ada', date: first, body: doc(para(text('ok'))) },
				{ authorName: 'Grace', date: second, body: doc(para(text('asd asd sa'))) },
			],
			{ locale: 'en' }
		)
		expect(plain).toBe(
			`Ada • ${formatTranscriptTime(first, 'en')}\nok\n\n` +
				`Grace • ${formatTranscriptTime(second, 'en')}\nasd asd sa`
		)
	})

	it('resolves mentions to their current names', () => {
		const { text: plain } = formatThreadTranscript(
			[{ authorName: 'Ada', date: first, body: doc(para(text('hey '), mention('u1', 'Old'))) }],
			{ locale: 'en', resolveName: (id) => (id === 'u1' ? 'Grace Hopper' : undefined) }
		)
		expect(plain).toContain('Grace Hopper')
		expect(plain).not.toContain('Old')
	})

	it('escapes the author name in the html and keeps the body formatting', () => {
		const { html } = formatThreadTranscript(
			[
				{
					authorName: '<b>Ada</b>',
					date: first,
					body: doc(para({ type: 'text', text: 'bold', marks: [{ type: 'bold' }] })),
				},
			],
			{ locale: 'en' }
		)
		expect(html).toContain('<strong>&lt;b&gt;Ada&lt;/b&gt;</strong>')
		expect(html).toContain('<strong>bold</strong>')
	})

	it('writes a compact absolute time: day, short month, year, 24-hour time and zone', () => {
		expect(formatTranscriptTime(first, 'en')).toMatch(/^\d{1,2} Nov 2026 \d{2}:\d{2}\S+$/)
	})

	it('drops the time when the date is invalid', () => {
		const { text: plain } = formatThreadTranscript(
			[{ authorName: 'Ada', date: 'not a date', body: doc(para(text('ok'))) }],
			{ locale: 'en' }
		)
		expect(plain).toBe('Ada\nok')
	})
})
