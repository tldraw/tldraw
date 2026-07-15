import { describe, expect, it } from 'vitest'
import { extractMentionIds } from './commentMentions'

describe('extractMentionIds', () => {
	it('collects mention node ids wherever they nest, deduped, in first-seen order', () => {
		const body = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'hi ' },
						{ type: 'mention', attrs: { id: 'user_a', label: 'A' } },
						{ type: 'mention', attrs: { id: 'user_b', label: 'B' } },
						{ type: 'mention', attrs: { id: 'user_a', label: 'A again' } },
					],
				},
				{
					type: 'bulletList',
					content: [
						{
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'mention', attrs: { id: 'user_c' } }],
								},
							],
						},
					],
				},
			],
		}
		expect(extractMentionIds(body)).toEqual(['user_a', 'user_b', 'user_c'])
	})

	it('returns an empty array for a body without mentions', () => {
		expect(
			extractMentionIds({
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: 'plain' }] }],
			})
		).toEqual([])
	})

	it('ignores mention nodes without a string id', () => {
		expect(
			extractMentionIds({
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'mention', attrs: { id: 123 } }, { type: 'mention' }],
					},
				],
			})
		).toEqual([])
	})

	it('tolerates non-conforming input', () => {
		expect(extractMentionIds(null)).toEqual([])
		expect(extractMentionIds(undefined)).toEqual([])
		expect(extractMentionIds('a string')).toEqual([])
		expect(extractMentionIds({ type: 'doc' })).toEqual([])
	})
})
