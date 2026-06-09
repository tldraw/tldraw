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
const ANALYTICS_ENGINE_MAX_BLOB_BYTES = 16 * 1024
const TRUNCATED_ANALYTICS_SUFFIX = '...[truncated]'

export function isHostCodeEditor(hostName: MCP_APP_HOST_NAMES): boolean {
	return CODE_EDITOR_HOST_NAMES.includes(hostName)
}

function truncateUtf8String(value: string, maxBytes: number): string {
	const encoder = new TextEncoder()
	if (maxBytes <= 0) return ''
	if (encoder.encode(value).byteLength <= maxBytes) return value

	const suffixByteLength = encoder.encode(TRUNCATED_ANALYTICS_SUFFIX).byteLength
	if (suffixByteLength >= maxBytes) {
		let low = 0
		let high = TRUNCATED_ANALYTICS_SUFFIX.length

		while (low < high) {
			const mid = Math.ceil((low + high) / 2)
			if (encoder.encode(TRUNCATED_ANALYTICS_SUFFIX.slice(0, mid)).byteLength <= maxBytes) {
				low = mid
			} else {
				high = mid - 1
			}
		}

		return TRUNCATED_ANALYTICS_SUFFIX.slice(0, low)
	}

	const maxValueBytes = maxBytes - suffixByteLength
	let low = 0
	let high = value.length

	while (low < high) {
		const mid = Math.ceil((low + high) / 2)
		if (encoder.encode(value.slice(0, mid)).byteLength <= maxValueBytes) {
			low = mid
		} else {
			high = mid - 1
		}
	}

	return `${value.slice(0, low)}${TRUNCATED_ANALYTICS_SUFFIX}`
}

export function writeToolAnalytics(
	analytics: AnalyticsEngineDataset | undefined,
	toolName: string,
	code: string
) {
	if (!analytics) return

	const encoder = new TextEncoder()
	const baseBlobs = ['tool_called', toolName]
	const maxCodeBytes =
		ANALYTICS_ENGINE_MAX_BLOB_BYTES -
		baseBlobs.reduce((total, blob) => total + encoder.encode(blob).byteLength, 0)

	try {
		analytics.writeDataPoint({
			blobs: [...baseBlobs, truncateUtf8String(code, maxCodeBytes)],
		})
	} catch {
		// writeDataPoint returns immediately and never throws, so we won't know if it failed
	}
}
