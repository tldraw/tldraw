import type { TLShape } from '@tldraw/editor'
import {
	CORE_ACTIVITIES,
	evaluateRule,
	type TLBeforeActionCallback,
	type TLIdentityUser,
	type TLPermissionRule,
} from '@tldraw/editor'
import type { UnknownRecord } from '@tldraw/store'
import { NetworkDiff, RecordOpType, applyObjectDiff } from '@tldraw/sync-core'

// Re-export client-side types and classes from @tldraw/editor
export {
	CORE_ACTIVITIES,
	TLPermissionsManager,
	evaluateRule,
	getShapeCreator,
	getShapeCreatorId,
	type CoreActivityId,
	type TLAfterActionCallback,
	type TLAttributionUser,
	type TLBeforeActionCallback,
	type TLIdentityProvider,
	type TLIdentityUser,
	type TLPermissionContext,
	type TLPermissionRule,
	type TLPermissionsManagerConfig,
} from '@tldraw/editor'

// ─── Server-side permissions filter ─────────────────────────────────────────

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
		const user: TLIdentityUser = { id: meta.userId, name: meta.userName ?? meta.userId }
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
					if (prev) {
						const next = applyObjectDiff(prev, op[1]) as unknown as TLShape
						if (
							evaluateRule(
								rules,
								CORE_ACTIVITIES.UPDATE_SHAPE,
								{
									user,
									activityId: CORE_ACTIVITIES.UPDATE_SHAPE,
									targetShape: prev,
									prevShape: prev,
									nextShape: next,
								},
								beforeActionCallbacks
							)
						) {
							filtered[id] = op
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
