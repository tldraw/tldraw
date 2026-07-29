import Anthropic from '@anthropic-ai/sdk'
import { describeError } from '../mcp-client.js'
import { addUsage, emptyUsage } from '../types.js'
import type { AgentResult, EvalAgent } from '../types.js'

/**
 * Agent adapter for the Anthropic Messages API.
 *
 * The adapter owns the model loop and nothing else — fixtures, grading, pacing,
 * and metrics all live in the harness. That split is what makes a second adapter
 * cheap to add, and it is why tool calls are counted from the MCP client's own
 * record rather than from anything this file reports about itself.
 */

export interface ClaudeAgentOptions {
	name?: string
	model?: string
	effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max'
	maxTokens?: number
	apiKey?: string
}

/** Mirrors the MCP tool definitions into the Messages API tool format. */
interface McpToolDefinition {
	name: string
	description: string
	inputSchema: unknown
}

export function createClaudeAgent(options: ClaudeAgentOptions = {}): EvalAgent {
	const model = options.model ?? 'claude-opus-5'
	const effort = options.effort ?? 'high'
	const maxTokens = options.maxTokens ?? 16_000
	const client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {})

	return {
		name: options.name ?? `claude:${model}:${effort}`,

		async run({ systemPrompt, userPrompt, mcp, maxToolCalls, signal }): Promise<AgentResult> {
			const { tools: mcpTools } = await mcp.listTools()
			const tools = (mcpTools as McpToolDefinition[])
				// The eval only exercises the read-only board tools; anything else the
				// server grows later should be opted into deliberately, not inherited.
				.filter(
					(tool) => tool.name === 'get_board_info' || tool.name === 'get_shared_board_screenshot'
				)
				.map((tool) => ({
					name: tool.name,
					description: tool.description,
					input_schema: tool.inputSchema as Anthropic.Tool['input_schema'],
				}))

			const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }]
			const usage = emptyUsage()
			const transcript: unknown[] = []
			let agentMs = 0
			let toolCallsMade = 0
			let stoppedBecause: AgentResult['stoppedBecause']
			let finalText = ''

			while (true) {
				if (signal.aborted) {
					stoppedBecause = 'timeout'
					break
				}

				const started = Date.now()
				const response = await client.messages.create(
					{
						model,
						max_tokens: maxTokens,
						system: systemPrompt,
						output_config: { effort },
						tools,
						messages,
					},
					{ signal }
				)
				agentMs += Date.now() - started

				addUsage(usage, {
					inputTokens: response.usage.input_tokens,
					outputTokens: response.usage.output_tokens,
					cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
					cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
				})
				transcript.push({
					role: 'assistant',
					content: response.content,
					stop_reason: response.stop_reason,
				})

				// A classifier decline is not a wrong answer about the board — surface it
				// as an infra-shaped stop so it never lands in the quality denominator.
				if (response.stop_reason === 'refusal') {
					throw new Error(`model refused: ${JSON.stringify(response.stop_details ?? {})}`)
				}

				messages.push({ role: 'assistant', content: response.content })
				finalText = response.content
					.filter((block): block is Anthropic.TextBlock => block.type === 'text')
					.map((block) => block.text)
					.join('\n')

				const toolUses = response.content.filter(
					(block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
				)
				if (toolUses.length === 0) break

				if (toolCallsMade + toolUses.length > maxToolCalls) {
					stoppedBecause = 'budget_exceeded'
					break
				}

				const results: Anthropic.ToolResultBlockParam[] = []
				for (const toolUse of toolUses) {
					toolCallsMade++
					try {
						const result = await mcp.callTool(
							toolUse.name,
							toolUse.input as Record<string, unknown>
						)
						results.push({
							type: 'tool_result',
							tool_use_id: toolUse.id,
							is_error: result.isError === true,
							content: toMessageContent(result),
						})
					} catch (error) {
						// A transport failure is reported back to the agent rather than
						// thrown, so a single flaky call doesn't discard an otherwise
						// complete attempt — the agent can retry or answer around it.
						results.push({
							type: 'tool_result',
							tool_use_id: toolUse.id,
							is_error: true,
							content: `Tool call failed: ${describeError(error)}`,
						})
					}
				}

				transcript.push({ role: 'user', content: results })
				messages.push({ role: 'user', content: results })
			}

			return {
				answer: extractAnswer(finalText),
				answerBlock: extractAnswerBlock(finalText),
				rawFinalText: finalText,
				usage,
				agentMs,
				transcript,
				stoppedBecause,
			}
		},
	}
}

/**
 * Converts an MCP tool result into Messages API content. The screenshot tool
 * returns the page name as text followed by a base64 PNG, so the image has to
 * survive this hop intact — it is the entire input for every task type.
 */
function toMessageContent(result: {
	content: { type: string; text?: string; data?: string; mimeType?: string }[]
}): Anthropic.ToolResultBlockParam['content'] {
	const blocks: Exclude<Anthropic.ToolResultBlockParam['content'], string> = []

	for (const block of result.content) {
		if (block.type === 'text' && block.text) {
			blocks.push({ type: 'text', text: block.text })
		} else if (block.type === 'image' && block.data) {
			blocks.push({
				type: 'image',
				source: {
					type: 'base64',
					media_type: (block.mimeType ?? 'image/png') as 'image/png',
					data: block.data,
				},
			})
		}
	}

	return blocks.length > 0 ? blocks : [{ type: 'text', text: '(empty tool result)' }]
}

/**
 * Pulls the JSON out of the agent's `<answer>` block.
 *
 * A structured envelope is what turns `locate` and `find-many` into arithmetic
 * instead of judgement, so failing to find one is a real, distinct outcome
 * (`malformed_answer`) rather than something to paper over with prose parsing.
 */
export function extractAnswerBlock(text: string): string | null {
	const match = /<answer>([\s\S]*?)<\/answer>/i.exec(text)
	if (!match) return null

	let body = match[1].trim()
	// Models frequently wrap the payload in a fence even when told not to.
	const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(body)
	if (fenced) body = fenced[1].trim()
	return body
}

export function extractAnswer(text: string): unknown {
	const body = extractAnswerBlock(text)
	if (body === null) return null

	try {
		return JSON.parse(body)
	} catch {
		return null
	}
}
