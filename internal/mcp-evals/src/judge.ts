import Anthropic from '@anthropic-ai/sdk'
import type { Judge } from './grade.js'
import { emptyUsage } from './types.js'

/**
 * LLM judge for `describe` tasks — the only place in the harness where a model
 * decides a score.
 *
 * It votes on each rubric criterion separately and returns booleans. Binary
 * per-criterion verdicts survive judge model upgrades far better than a 1–10
 * quality score, whose midpoint drifts between versions and quietly reshapes
 * every historical comparison.
 */
export function createClaudeJudge(options: { model?: string; apiKey?: string } = {}): Judge {
	const model = options.model ?? 'claude-opus-5'
	const client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {})

	return {
		async score({ reference, rubric, description }) {
			const criteria = rubric.map((item, index) => `${index + 1}. ${item}`).join('\n')

			const response = await client.messages.create({
				model,
				max_tokens: 2_000,
				// Low effort on purpose: these are independent yes/no reading-comprehension
				// checks against a reference, not a task that rewards deliberation.
				output_config: { effort: 'low' },
				system: [
					'You grade descriptions of a whiteboard against a reference description.',
					'Judge each criterion independently and literally. A criterion is met only if the candidate description actually supports it.',
					'Wording does not need to match the reference. Substance does.',
					'Reply with nothing but a <verdict> block containing JSON.',
				].join(' '),
				messages: [
					{
						role: 'user',
						content: `Reference description of the board:
"""
${reference}
"""

Candidate description to grade:
"""
${description}
"""

Criteria:
${criteria}

Reply in exactly this form, with one boolean per criterion in order:

<verdict>{"verdicts": [true, false, ...], "notes": "<one sentence>"}</verdict>`,
					},
				],
			})

			const text = response.content
				.filter((block): block is Anthropic.TextBlock => block.type === 'text')
				.map((block) => block.text)
				.join('\n')

			const usage = {
				...emptyUsage(),
				inputTokens: response.usage.input_tokens,
				outputTokens: response.usage.output_tokens,
				cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
				cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
			}

			const parsed = parseVerdict(text, rubric.length)
			return { verdicts: parsed.verdicts, notes: parsed.notes, usage }
		},
	}
}

function parseVerdict(text: string, expected: number): { verdicts: boolean[]; notes?: string } {
	const match = /<verdict>([\s\S]*?)<\/verdict>/i.exec(text)
	const body = match ? match[1].trim() : text.trim()
	try {
		const parsed = JSON.parse(body.replace(/^```(?:json)?|```$/g, '').trim()) as {
			verdicts?: unknown
			notes?: unknown
		}
		if (Array.isArray(parsed.verdicts)) {
			const verdicts = parsed.verdicts.map((entry) => entry === true)
			// Pad rather than throw: a judge that returns too few verdicts should cost
			// the candidate those criteria, not void the whole attempt.
			while (verdicts.length < expected) verdicts.push(false)
			return {
				verdicts: verdicts.slice(0, expected),
				notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
			}
		}
	} catch {
		// fall through
	}
	return { verdicts: new Array(expected).fill(false), notes: 'judge output could not be parsed' }
}
