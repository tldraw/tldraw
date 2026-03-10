import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { TLShape } from 'tldraw'
import type { MCP_APP_HOST_NAMES } from './types'

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeShapeId(id: string): string {
	return id.startsWith('shape:') ? id : `shape:${id}`
}

export function toSimpleShapeId(id: string): string {
	return id.replace(/^shape:/, '')
}

export function deepMerge(base: unknown, patch: unknown): unknown {
	if (!isPlainObject(base) || !isPlainObject(patch)) return patch
	const merged: Record<string, unknown> = { ...base }
	for (const [key, value] of Object.entries(patch)) {
		merged[key] = deepMerge(merged[key], value)
	}
	return merged
}

export function parseTlShapes(value: unknown[]): TLShape[] {
	return value.filter(
		(s): s is TLShape => isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
	)
}

export function errorResponse(toolName: string, err: unknown, hint?: string): CallToolResult {
	const message = err instanceof Error ? err.message : String(err)
	const parts = [`[${toolName}] Error: ${message}`]
	if (hint) parts.push(hint)
	return {
		content: [{ type: 'text', text: parts.join('\n\n') }],
		isError: true,
	}
}

export function generateCheckpointId(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 18)
}

export function resolveMcpAppHostName(potentialHostName: string): MCP_APP_HOST_NAMES | undefined {
	const normalizedPotentialHostName = potentialHostName.trim().toLowerCase()
	if (normalizedPotentialHostName.includes('cursor-vscode')) return 'cursor' // we expect something like "cursor-vscode (via mcp-remote 0.1.37)"
	if (normalizedPotentialHostName.includes('visual studio code')) return 'vscode' // we expect something like "Visual Studio Code (via mcp-remote 0.1.37)"
	if (normalizedPotentialHostName.includes('openai-mcp')) return 'chatgpt' // we expect something like "openai-mcp"
	if (normalizedPotentialHostName.includes('claude-ai')) return 'claude' // we expect something like "claude-ai (via mcp-remote 0.1.37)"

	return undefined
}

const CODE_EDITOR_HOST_NAMES: MCP_APP_HOST_NAMES[] = ['cursor', 'vscode']

export function isHostCodeEditor(hostName: MCP_APP_HOST_NAMES): boolean {
	return CODE_EDITOR_HOST_NAMES.includes(hostName)
}
