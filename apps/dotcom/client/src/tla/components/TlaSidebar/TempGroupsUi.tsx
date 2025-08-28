import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	uniqueId,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useHasFlag } from '../../hooks/useHasFlag'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './groups.module.css'

export function TempGroupsUi() {
	const hasGroupsFlag = useHasFlag('groups')
	const app = useApp()

	const groupMembers = useValue('groupMembers', () => app.getGroupMemberships(), [app])

	if (!hasGroupsFlag) return null

	return (
		<div className={styles.groupsSection}>
			<div className={styles.groupsTitle}>
				{
					// eslint-disable-next-line react/jsx-no-literals
					'Groups'
				}
				<button
					className={styles.groupsButton}
					onClick={() => {
						const name = window.prompt('Enter a name for the new group')
						if (!name) return
						app.z.mutate.group.create({ id: uniqueId(), name })
					}}
				>
					<TlaIcon icon="plus" />
				</button>
			</div>
			{groupMembers.map((groupMember) => (
				<GroupItem key={groupMember.groupId} id={groupMember.groupId} />
			))}
		</div>
	)
}

interface PresenceBadgesProps {
	fileId: string
	className?: string
	badgeClassName?: string
}

export function PresenceBadges({ fileId, className, badgeClassName }: PresenceBadgesProps) {
	const app = useApp()
	const presences = useValue(
		'presences',
		() => app.getPresences(fileId).filter((p) => p.userId !== app.userId),
		[fileId, app]
	)

	if (presences.length === 0) {
		return null
	}

	return (
		<div className={className}>
			{presences.map((presence) => (
				<div key={presence.userId} className={badgeClassName}>
					<div
						style={{
							width: 16,
							height: 16,
							borderRadius: '50%',
							backgroundColor: presence.color ?? 'var(--tla-color-contrast)',
							border: '2px solid var(--tla-color-contrast)',
							marginLeft: -4, // Creates overlap between badges
						}}
					/>
				</div>
			))}
		</div>
	)
}

interface GroupFileItemProps {
	fileId: string
	groupId?: string
}

function GroupFileItem({ fileId, groupId }: GroupFileItemProps) {
	const navigate = useNavigate()
	const app = useApp()
	const hasGroups = useHasFlag('groups')

	const file = useValue(
		'file',
		() => {
			return app.getFile(fileId)
		},
		[app, fileId]
	)

	if (!file) {
		return null
	}

	const isOwnedByGroup = file.owningGroupId === groupId

	return (
		<div key={file.id} className={styles.fileItem}>
			<div className={styles.fileName}>{file.name}</div>
			{!isOwnedByGroup && (
				<div className={styles.groupName} title={`From ${file.ownerName}`}>
					<TlaIcon icon="link" />
				</div>
			)}
			{hasGroups && (
				<PresenceBadges
					fileId={fileId}
					className={styles.presenceBadges}
					badgeClassName={styles.presenceBadge}
				/>
			)}
			<button
				className={styles.fileButton}
				onClick={() => {
					navigate(`/f/${file.id}`)
				}}
			/>
		</div>
	)
}

function GroupItem({ id }: { id: string }) {
	const app = useApp()
	const group = useValue(
		'group',
		() => {
			return app.getGroupMembership(id)
		},
		[app]
	)
	const canDelete = useValue(
		'canDelete',
		() => {
			return group?.groupMembers.some((u) => u.userId === app.userId && u.role === 'owner')
		},
		[group]
	)
	const canLeave = useValue(
		'canLeave',
		() => {
			const userMember = group?.groupMembers.find((u) => u.userId === app.userId)
			if (!userMember) return false
			// Can't leave if you're the only owner
			if (userMember.role === 'owner') {
				const owners = group?.groupMembers.filter((u) => u.role === 'owner') || []
				return owners.length > 1
			}
			return true
		},
		[group]
	)

	return (
		<div key={group?.groupId} className={styles.group}>
			<div className={styles.groupHeader}>
				<TlaIcon icon="group" />
				<div className={styles.groupName}>{group?.group.name}</div>
				<TldrawUiDropdownMenuRoot id={`group-menu-${id}`}>
					<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
						<TldrawUiDropdownMenuTrigger>
							<button className={styles.membersButton}>
								<TlaIcon icon="dots-vertical-strong" />
							</button>
						</TldrawUiDropdownMenuTrigger>
						<TldrawUiDropdownMenuContent side="bottom" align="end" alignOffset={0} sideOffset={4}>
							<TldrawUiMenuGroup id="group-actions">
								<TldrawUiMenuItem
									id="members"
									label="Members"
									onSelect={() => {
										window.alert(
											`Members:\n${group?.groupMembers.map((u) => `${u.userName} (${u.role})`).join('\n')}`
										)
									}}
								/>
								{canDelete && (
									<TldrawUiMenuItem
										id="delete"
										label="Delete"
										onSelect={() => {
											app.z.mutate.group.delete({ id })
										}}
									/>
								)}
								{canLeave && (
									<TldrawUiMenuItem
										id="leave"
										label="Leave"
										onSelect={() => {
											app.z.mutate.group.leave({ groupId: id })
										}}
									/>
								)}
								<TldrawUiMenuItem
									id="leave"
									label="Copy invite link"
									onSelect={() => {
										app.copyGroupInvite(id)
									}}
								/>
							</TldrawUiMenuGroup>
						</TldrawUiDropdownMenuContent>
					</TldrawUiMenuContextProvider>
				</TldrawUiDropdownMenuRoot>
			</div>
			<div className={styles.fileList}>
				{group?.groupFiles.map((groupFile) => {
					return groupFile.file ? (
						<GroupFileItem
							key={groupFile.file.id}
							fileId={groupFile.file.id}
							groupId={group?.groupId}
						/>
					) : null
				})}
			</div>
		</div>
	)
}
