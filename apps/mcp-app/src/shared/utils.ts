import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { TLShape } from 'tldraw'
import type { MCP_APP_HOST_NAMES } from './types'

const CANVAS_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const CANVAS_ID_LENGTH = 8

export function generateCanvasId(): string {
	const bytes = new Uint8Array(CANVAS_ID_LENGTH)
	crypto.getRandomValues(bytes)
	return Array.from(bytes, (b) => CANVAS_ID_CHARS[b % CANVAS_ID_CHARS.length]).join('')
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
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

// these are what we get from server.server.getClientVersion() in the worker
export function resolveMcpAppHostNameFromServerInfo(
	potentialHostName: string
): MCP_APP_HOST_NAMES | undefined {
	const normalizedPotentialHostName = potentialHostName.trim().toLowerCase()

	if (normalizedPotentialHostName.includes('cursor-vscode')) return 'cursor' // we expect something like "cursor-vscode (via mcp-remote 0.1.37)"
	if (normalizedPotentialHostName.includes('visual studio code')) return 'vscode' // we expect something like "Visual Studio Code (via mcp-remote 0.1.37)"
	if (
		normalizedPotentialHostName.includes('openai-mcp') ||
		normalizedPotentialHostName.includes('chatgpt')
	)
		return 'chatgpt' // we expect something like "openai-mcp"
	if (normalizedPotentialHostName.includes('claude-ai')) return 'claude' // we expect something like "claude-ai (via mcp-remote 0.1.37)"

	return undefined
}

// these are what we expect from app.getHostVersion() (called in the client)
export function resolveMcpAppHostNameFromClientInfo(
	potentialHostName: string
): MCP_APP_HOST_NAMES | undefined {
	const normalizedPotentialHostName = potentialHostName.trim().toLowerCase()

	if (normalizedPotentialHostName.includes('cursor')) return 'cursor'
	if (normalizedPotentialHostName.includes('visual studio code')) return 'vscode'
	if (normalizedPotentialHostName.includes('chatgpt')) return 'chatgpt'
	if (normalizedPotentialHostName.includes('claude')) return 'claude'

	return undefined
}

const CODE_EDITOR_HOST_NAMES: MCP_APP_HOST_NAMES[] = ['cursor', 'vscode']

export function isHostCodeEditor(hostName: MCP_APP_HOST_NAMES): boolean {
	return CODE_EDITOR_HOST_NAMES.includes(hostName)
}
