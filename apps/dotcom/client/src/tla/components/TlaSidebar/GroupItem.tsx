import { useNavigate } from 'react-router-dom'
import {
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useValue,
} from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './groups.module.css'

export function GroupItem({ id }: { id: string }) {
	const navigate = useNavigate()
	const app = useApp()
	const group = useValue(
		'group',
		() => {
			return app.getGroup(id)
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
									label="Copy accept snippet"
									onSelect={() => {
										navigator.clipboard.writeText(
											`app.z.mutate.group.acceptInvite({ inviteSecret: '${group?.group.inviteSecret}' })`
										)
									}}
								/>
							</TldrawUiMenuGroup>
						</TldrawUiDropdownMenuContent>
					</TldrawUiMenuContextProvider>
				</TldrawUiDropdownMenuRoot>
			</div>
			<div className={styles.fileList}>
				{group?.groupFiles.map((groupFile) => {
					const isOwnedByGroup = groupFile.file?.owningGroupId === group?.groupId
					return groupFile.file ? (
						<div key={groupFile.file.id} className={styles.fileItem}>
							<div className={styles.fileName}>{groupFile.file.name}</div>
							{!isOwnedByGroup && (
								<div className={styles.groupName} title={`From ${groupFile.file.ownerName}`}>
									<TlaIcon icon="link" />
								</div>
							)}
							<button
								className={styles.fileButton}
								onClick={() => {
									navigate(`/f/${groupFile.file!.id}`)
								}}
							/>
						</div>
					) : null
				})}
			</div>
		</div>
	)
}
