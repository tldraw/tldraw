/**
 * The workspace an analytics event happened in, as a PostHog event property.
 *
 * Kept free of posthog-js and React so the rule stays unit-testable. `workspace_id` is set on
 * every captured event while a signed-in user has an active workspace; an event may name a
 * different workspace explicitly (workspace settings act on the workspace being edited, which
 * is not always the active one) and that value wins.
 */

export const WORKSPACE_ID_PROPERTY = 'workspace_id'

/** Typed event data uses camelCase, like the other event params; PostHog properties use snake_case. */
const EXPLICIT_WORKSPACE_PARAM = 'workspaceId'

let activeWorkspaceId: string | null = null

/** Called by the signed-in analytics component as the active workspace changes; null when signed out. */
export function setActiveWorkspaceIdForAnalytics(workspaceId: string | null): void {
	activeWorkspaceId = workspaceId
}

export function getActiveWorkspaceIdForAnalytics(): string | null {
	return activeWorkspaceId
}

/**
 * Stamp `workspace_id` onto an event's properties, in place. An explicit `workspaceId` param is
 * renamed to the property; otherwise the active workspace is used; with neither, the property is
 * left off rather than sent as null.
 */
export function applyWorkspaceIdProperty(
	properties: Record<string, unknown>,
	active: string | null = activeWorkspaceId
): Record<string, unknown> {
	const explicit = properties[EXPLICIT_WORKSPACE_PARAM]
	if (typeof explicit === 'string' && explicit) {
		properties[WORKSPACE_ID_PROPERTY] = explicit
	}
	delete properties[EXPLICIT_WORKSPACE_PARAM]
	if (properties[WORKSPACE_ID_PROPERTY] === undefined && active) {
		properties[WORKSPACE_ID_PROPERTY] = active
	}
	return properties
}

/** The subset of the app the active-workspace rule reads; narrow so it can be faked in tests. */
export interface ActiveWorkspaceSource {
	getFile(fileId: string): { owningGroupId?: string | null } | null | undefined
	getWorkspaceMembership(workspaceId: string): unknown
	getHomeWorkspaceId(): string
}

/**
 * The active workspace is derived from the open file, not stored: the file's owning workspace
 * when the user is a member of it, otherwise the home workspace. A guest viewing a shared file
 * is therefore "in" their home workspace, matching what the sidebar shows them.
 */
export function getActiveWorkspaceId(
	app: ActiveWorkspaceSource,
	fileSlug: string | undefined
): string {
	if (fileSlug) {
		const file = app.getFile(fileSlug)
		if (file?.owningGroupId && app.getWorkspaceMembership(file.owningGroupId)) {
			return file.owningGroupId
		}
	}
	return app.getHomeWorkspaceId()
}
