import type { UnknownRecord } from '@tldraw/store'
import { NetworkDiff, RecordOpType, applyObjectDiff, diffRecord } from '@tldraw/sync-core'
import {
	CORE_ACTIVITIES,
	UserRecordType,
	createUserId,
	evaluateRule,
	type TLBeforeActionCallback,
	type TLPermissionRule,
	type TLShape,
	type TLUser,
} from '@tldraw/tlschema'

// Re-export shared types from @tldraw/tlschema for consumers of this package.
// Note: TLPermissionsManager (the client-side class) lives in @tldraw/editor and is
// intentionally not re-exported here — it depends on browser APIs and React.
export {
	CORE_ACTIVITIES,
	evaluateRule,
	getShapeCreatorId,
	type CoreActivityId,
	type TLAfterActionCallback,
	type TLBeforeActionCallback,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
} from '@tldraw/tlschema'

/**
 * Creates a `filterPush` callback for `TLSocketRoom` from the same declarative
 * rules used client-side. Non-shape records pass through unchanged.
 *
 * @public
 */
export function createServerPermissionsFilter<
	SessionMeta extends { userId: string; userName?: string },
	R extends UnknownRecord = UnknownRecord,
>(
	rules: Record<string, TLPermissionRule>,
	beforeActionCallbacks?: TLBeforeActionCallback[]
): (args: {
	sessionId: string
	meta: SessionMeta
	diff: NetworkDiff<R>
	getRecord(id: string): R | undefined
}) => NetworkDiff<R> {
	return ({ meta, diff, getRecord }) => {
		const user: TLUser = UserRecordType.create({
			id: createUserId(meta.userId),
			name: meta.userName ?? meta.userId,
		})
		const filtered: NetworkDiff<R> = {}

		for (const [id, op] of Object.entries(diff) as [string, (typeof diff)[string]][]) {
			if (!id.startsWith('shape:')) {
				filtered[id] = op
				continue
			}

			switch (op[0]) {
				case RecordOpType.Put: {
					const record = op[1] as unknown as TLShape
					if (
						evaluateRule(
							rules,
							CORE_ACTIVITIES.CREATE_SHAPE,
							{
								user,
								activityId: CORE_ACTIVITIES.CREATE_SHAPE,
								targetShape: record,
								shapeType: record.type,
							},
							beforeActionCallbacks
						)
					) {
						filtered[id] = op
					}
					break
				}
				case RecordOpType.Patch: {
					const prev = getRecord(id) as unknown as TLShape | undefined
					if (!prev) break

					const next = applyObjectDiff(prev, op[1]) as unknown as TLShape
					const ctx = {
						user,
						activityId: CORE_ACTIVITIES.UPDATE_SHAPE,
						targetShape: prev,
						prevShape: prev,
						nextShape: next,
					}

					if (!evaluateRule(rules, CORE_ACTIVITIES.UPDATE_SHAPE, ctx, beforeActionCallbacks)) break

					let allowedNext = next
					if ((next.x !== prev.x || next.y !== prev.y) && CORE_ACTIVITIES.MOVE_SHAPE in rules) {
						if (
							!evaluateRule(
								rules,
								CORE_ACTIVITIES.MOVE_SHAPE,
								{ ...ctx, activityId: CORE_ACTIVITIES.MOVE_SHAPE },
								beforeActionCallbacks
							)
						) {
							allowedNext = { ...allowedNext, x: prev.x, y: prev.y }
						}
					}
					if (next.rotation !== prev.rotation && CORE_ACTIVITIES.ROTATE_SHAPE in rules) {
						if (
							!evaluateRule(
								rules,
								CORE_ACTIVITIES.ROTATE_SHAPE,
								{ ...ctx, activityId: CORE_ACTIVITIES.ROTATE_SHAPE },
								beforeActionCallbacks
							)
						) {
							allowedNext = { ...allowedNext, rotation: prev.rotation }
						}
					}
					if (next.props !== prev.props && CORE_ACTIVITIES.EDIT_SHAPE_PROPS in rules) {
						if (
							!evaluateRule(
								rules,
								CORE_ACTIVITIES.EDIT_SHAPE_PROPS,
								{ ...ctx, activityId: CORE_ACTIVITIES.EDIT_SHAPE_PROPS },
								beforeActionCallbacks
							)
						) {
							allowedNext = { ...allowedNext, props: prev.props } as typeof next
						}
					}

					if (allowedNext === next) {
						filtered[id] = op
					} else {
						const filteredPatch = diffRecord(prev, allowedNext)
						if (filteredPatch) {
							filtered[id] = [RecordOpType.Patch, filteredPatch]
						}
					}
					break
				}
				case RecordOpType.Remove: {
					const shape = getRecord(id) as unknown as TLShape | undefined
					if (
						shape &&
						evaluateRule(
							rules,
							CORE_ACTIVITIES.DELETE_SHAPE,
							{
								user,
								activityId: CORE_ACTIVITIES.DELETE_SHAPE,
								targetShape: shape,
							},
							beforeActionCallbacks
						)
					) {
						filtered[id] = op
					}
					break
				}
			}
		}
		return filtered
	}
}
