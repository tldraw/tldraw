import { useValue } from 'tldraw'
import { useActiveGroupId } from '../../../hooks/useActiveGroupId'
import { useApp } from '../../../hooks/useAppState'
import { F } from '../../../utils/i18n'
import { ReorderCursor } from './ReorderCursor'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'

/**
 * The scrollable lower region of the sidebar: the files of whichever space is
 * currently active (derived from the open file). This replaces the old
 * "My files + inline-expandable groups" layout — there is a single flat file
 * list for the active space, with no per-group expand/collapse.
 */
export function TlaSidebarRecentFilesNew() {
	const app = useApp()
	const activeGroupId = useActiveGroupId()
	const homeGroupId = app.getHomeGroupId()
	const isHome = activeGroupId === homeGroupId

	const group = useValue('active group', () => app.getGroupMembership(activeGroupId), [
		app,
		activeGroupId,
	])
	const files = useValue('active group files', () => app.getGroupFilesSorted(activeGroupId), [
		app,
		activeGroupId,
	])

	const groupName = isHome ? <F defaultMessage="My files" /> : group?.group.name

	return (
		<div
			data-drop-target-id={isHome ? homeGroupId : `group:${activeGroupId}`}
			data-group-id={activeGroupId}
		>
			<div
				style={{ fontSize: 12, paddingLeft: 8, paddingTop: 12, color: 'var(--tla-color-text-3)' }}
			>
				{groupName}
			</div>
			<div style={{ height: 8 }} />
			{files.map((item, i) => (
				<TlaSidebarFileLink
					groupId={activeGroupId}
					key={`active-file-${item.fileId}`}
					item={item}
					testId={`tla-file-link-${i}`}
				/>
			))}
			{/* Global drag cursor for file reordering */}
			<ReorderCursor />
		</div>
	)
}
