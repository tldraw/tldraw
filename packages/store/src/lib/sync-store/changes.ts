import { exhaustiveSwitchError } from '@tldraw/utils'
import { UnknownRecord } from '../BaseRecord'

export enum ChangeSource {
	Local = 'local',
	Upstream = 'upstream',
	Downstream = 'downstream',
}

export enum ChangeOpType {
	Set = 'set',
	Delete = 'delete',
}
export type ChangeOp<R extends UnknownRecord> =
	| { op: ChangeOpType.Set; prev?: R; record: R; clock: number }
	| { op: ChangeOpType.Delete; record: R; clock: number }

export type Changes<R extends UnknownRecord> = {
	[key: string]: ChangeOp<R>
}

export function addSetChange<R extends UnknownRecord>(
	changes: Changes<R>,
	prev: R | undefined,
	record: R,
	clock: number,
	mutate = false
): Changes<R> {
	const result = mutate ? changes : { ...changes }
	const existing = result[record.id]?.record ?? prev
	result[record.id] = existing
		? { op: ChangeOpType.Set, prev: existing, record, clock }
		: { op: ChangeOpType.Set, record, clock }
	return result
}
export function addDeleteChange<R extends UnknownRecord>(
	changes: Changes<R>,
	record: R,
	clock: number,
	mutate = false
): Changes<R> {
	const result = mutate ? changes : { ...changes }
	const existing = result[record.id]?.record ?? record
	result[record.id] = { op: ChangeOpType.Delete, record: existing, clock }
	return result
}
export function mergeChanges<R extends UnknownRecord>(
	a: Changes<R>,
	b: Changes<R>,
	mutate = false
): Changes<R> {
	const result: Changes<R> = mutate ? a : { ...a }
	for (const op of Object.values(b)) {
		switch (op.op) {
			case ChangeOpType.Set:
				addSetChange(result, op.prev, op.record, op.clock, true)
				break
			case ChangeOpType.Delete:
				addDeleteChange(result, op.record, op.clock, true)
				break
			default:
				exhaustiveSwitchError(op)
		}
	}
	return result
}
