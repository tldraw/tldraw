import { afterEach, describe, expect, it } from 'vitest'
import {
	applyWorkspaceIdProperty,
	getActiveWorkspaceId,
	setActiveWorkspaceIdForAnalytics,
	type ActiveWorkspaceSource,
} from './analyticsWorkspace'

describe('applyWorkspaceIdProperty', () => {
	afterEach(() => setActiveWorkspaceIdForAnalytics(null))

	it('stamps the active workspace onto an event that names none', () => {
		expect(applyWorkspaceIdProperty({ source: 'sidebar' }, 'ws_active')).toEqual({
			source: 'sidebar',
			workspace_id: 'ws_active',
		})
	})

	it('lets an explicit workspaceId param win over the active workspace, as workspace_id', () => {
		expect(
			applyWorkspaceIdProperty(
				{ source: 'workspace-settings', workspaceId: 'ws_edited' },
				'ws_active'
			)
		).toEqual({ source: 'workspace-settings', workspace_id: 'ws_edited' })
	})

	it('leaves the property off entirely when nothing is known, rather than sending null', () => {
		expect(applyWorkspaceIdProperty({ source: 'anon-top-bar' }, null)).toEqual({
			source: 'anon-top-bar',
		})
	})

	it('drops an empty explicit param and falls back to the active workspace', () => {
		expect(applyWorkspaceIdProperty({ workspaceId: '' }, 'ws_active')).toEqual({
			workspace_id: 'ws_active',
		})
	})

	it('reads the module-level active workspace by default', () => {
		setActiveWorkspaceIdForAnalytics('ws_module')
		expect(applyWorkspaceIdProperty({})).toEqual({ workspace_id: 'ws_module' })
	})

	it('does not overwrite a workspace_id already on the event', () => {
		expect(applyWorkspaceIdProperty({ workspace_id: 'ws_kept' }, 'ws_active')).toEqual({
			workspace_id: 'ws_kept',
		})
	})
})

describe('getActiveWorkspaceId', () => {
	const app = (opts: {
		file?: { owningGroupId?: string | null } | null
		memberOf?: string[]
	}): ActiveWorkspaceSource => ({
		getFile: () => opts.file ?? null,
		getWorkspaceMembership: (id) =>
			(opts.memberOf ?? []).includes(id) ? { groupId: id } : undefined,
		getHomeWorkspaceId: () => 'ws_home',
	})

	it("is the open file's owning workspace when the user is a member of it", () => {
		expect(
			getActiveWorkspaceId(
				app({ file: { owningGroupId: 'ws_team' }, memberOf: ['ws_team'] }),
				'file1'
			)
		).toBe('ws_team')
	})

	it('falls back to home when the user is only a guest on the file', () => {
		expect(
			getActiveWorkspaceId(app({ file: { owningGroupId: 'ws_other' }, memberOf: [] }), 'file1')
		).toBe('ws_home')
	})

	it('falls back to home with no file open', () => {
		expect(getActiveWorkspaceId(app({ memberOf: ['ws_team'] }), undefined)).toBe('ws_home')
	})

	it('falls back to home when the file is not in the store yet', () => {
		expect(getActiveWorkspaceId(app({ file: null }), 'file1')).toBe('ws_home')
	})
})
