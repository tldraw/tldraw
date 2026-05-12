import { TLShape, TLShapePartial } from '@tldraw/tlschema'

export type RpcOperation =
	| { command: 'createShape'; shape: TLShape }
	| { command: 'createShapes'; shapes: TLShape[] }
	| { command: 'updateShape'; shape: TLShapePartial }
	| { command: 'updateShapes'; shapes: TLShapePartial[] }
	| { command: 'deleteShape'; id: string }
	| { command: 'deleteShapes'; ids: string[] }

export interface RpcRequestBody {
	operations?: Array<{ command: string; params?: any }>
}

const MAX_OPERATIONS = 1000

/**
 * Validates and normalizes an RPC request body into a list of operations.
 * Returns null if the body is malformed.
 */
export function normalizeRpcOperations(body: RpcRequestBody | null): RpcOperation[] | null {
	if (!body || typeof body !== 'object') return null
	if (!Array.isArray(body.operations)) return null
	const rawOps = body.operations
	if (rawOps.length === 0 || rawOps.length > MAX_OPERATIONS) return null

	const normalized: RpcOperation[] = []
	for (const op of rawOps) {
		if (!op || typeof op.command !== 'string') return null
		const params = op.params ?? {}
		switch (op.command) {
			case 'createShape': {
				if (!params.shape || typeof params.shape !== 'object') return null
				normalized.push({ command: 'createShape', shape: params.shape as TLShape })
				break
			}
			case 'updateShape': {
				if (!params.shape || typeof params.shape !== 'object') return null
				normalized.push({ command: 'updateShape', shape: params.shape as TLShapePartial })
				break
			}
			case 'createShapes': {
				if (!Array.isArray(params.shapes)) return null
				normalized.push({ command: 'createShapes', shapes: params.shapes as TLShape[] })
				break
			}
			case 'updateShapes': {
				if (!Array.isArray(params.shapes)) return null
				normalized.push({ command: 'updateShapes', shapes: params.shapes as TLShapePartial[] })
				break
			}
			case 'deleteShape': {
				if (typeof params.id !== 'string') return null
				normalized.push({ command: 'deleteShape', id: params.id })
				break
			}
			case 'deleteShapes': {
				if (!Array.isArray(params.ids) || params.ids.some((x: any) => typeof x !== 'string')) {
					return null
				}
				normalized.push({ command: 'deleteShapes', ids: params.ids })
				break
			}
			default:
				return null
		}
	}
	return normalized
}
