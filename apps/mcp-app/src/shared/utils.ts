import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { TLShape } from 'tldraw'

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
