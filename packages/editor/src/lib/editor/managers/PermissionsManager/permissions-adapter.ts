import type {
	TLAfterActionCallback,
	TLBeforeActionCallback,
	TLPermissionContext,
	TLPermissionUser,
} from '@tldraw/tlschema'
import type { Editor } from '../../Editor'

/**
 * The core contract that permissions adapters must implement.
 *
 * The open-source tldraw SDK provides only this interface and the
 * `editor.permissions` field. All substantive permissions logic — rules,
 * evaluation, enforcement — lives in the adapter implementation (e.g. the
 * `@tldraw-x/permissions` package).
 *
 * @public
 */
export interface TLPermissionsController {
	canPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean
	tryPerform(activityId: string, context?: Partial<TLPermissionContext>): boolean
	hasRule(activityId: string): boolean
	getCurrentUser(): TLPermissionUser | null
	onBeforeAction(callback: TLBeforeActionCallback): () => void
	onAfterAction(callback: TLAfterActionCallback): () => void
	cleanup(): void
}

/**
 * Factory that creates a {@link TLPermissionsController} for an editor instance.
 *
 * Pass an adapter via `TLEditorOptions.permissionsAdapter` to plug in a
 * permissions implementation at editor construction time.
 *
 * Returning `null` signals that the adapter declined to activate (e.g. due to
 * a missing license entitlement). The editor treats this the same as having
 * no adapter at all — `editor.permissions` will be `null`.
 *
 * @public
 */
export interface TLPermissionsAdapter {
	create(editor: Editor): TLPermissionsController | null
}
