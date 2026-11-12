import { describe, expect, it } from 'vitest'
import { extractMentionIds, getMcpAgentFromCommentMeta } from './commentMentions'

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

describe('getMcpAgentFromCommentMeta', () => {
	it('reads the agent an MCP comment names', () => {
		expect(
			getMcpAgentFromCommentMeta({ mcpAgent: { id: 'mcp-agent:1', name: 'Bob', client: 'claude' } })
		).toEqual({ id: 'mcp-agent:1', name: 'Bob', client: 'claude' })
	})

	it('reads no client from meta that names none, or one we do not know', () => {
		expect(
			getMcpAgentFromCommentMeta({ mcpAgent: { id: 'mcp-agent:1', name: 'Bob' } })?.client
		).toBeNull()
		expect(
			getMcpAgentFromCommentMeta({ mcpAgent: { id: 'mcp-agent:1', name: 'Bob', client: 'gemini' } })
				?.client
		).toBeNull()
	})

	it.each([
		['no meta', undefined],
		['meta without an agent', {}],
		['an id without the agent prefix', { mcpAgent: { id: 'user:1', name: 'Claude' } }],
		['an empty name', { mcpAgent: { id: 'mcp-agent:1', name: '' } }],
		['a non-object agent', { mcpAgent: 'Claude' }],
	])('returns null for %s', (_, meta) => {
		expect(getMcpAgentFromCommentMeta(meta)).toBeNull()
	})
})
