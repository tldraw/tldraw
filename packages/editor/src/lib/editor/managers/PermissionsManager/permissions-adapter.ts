import type { TLUser } from '@tldraw/tlschema'
import type { Editor } from '../../Editor'
import type {
	TLAfterActionCallback,
	TLBeforeActionCallback,
	TLPermissionContext,
	TLPermissionsManagerConfig,
} from './permissions-types'

/**
 * The core contract that external permissions adapters must implement.
 * Convenience methods (e.g. `canCreateShape`, `canUseTool`) live on the
 * concrete {@link TLPermissionsManager} and are not part of this interface.
 *
 * @public
 */
export interface TLPermissionsController {
	canPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean
	tryPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean
	hasRule(activityId: string): boolean
	getCurrentUser(): TLUser | null
	onBeforeAction(callback: TLBeforeActionCallback): () => void
	onAfterAction(callback: TLAfterActionCallback): () => void
	cleanup(): void
}

/** @public */
export interface TLPermissionsAdapter {
	create(editor: Editor, config: TLPermissionsManagerConfig): TLPermissionsController
}
