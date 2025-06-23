import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
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
			return group?.groupMembers.some((u) => u.user.id === app.userId && u.role === 'owner')
		},
		[group]
	)

	return (
		<div key={group?.groupId} className={styles.group}>
			<div className={styles.groupHeader}>
				<TlaIcon icon="group" />
				<div className={styles.groupName}>{group?.group.name}</div>
				<button
					className={styles.membersButton}
					onClick={() => {
						window.alert(
							`Members:\n${group?.groupMembers.map((u) => `${u.user.name} (${u.role})`).join('\n')}`
						)
					}}
				>
					{
						// eslint-disable-next-line react/jsx-no-literals
						'Members'
					}
				</button>
				{canDelete && (
					<button
						className={styles.deleteButton}
						onClick={() => {
							app.z.mutate.group.delete({ id })
						}}
					>
						{
							// eslint-disable-next-line react/jsx-no-literals
							'Delete'
						}
					</button>
				)}
			</div>
			<div className={styles.fileList}>
				{group?.groupFiles.map((groupFile) => {
					return groupFile.file ? (
						<div key={groupFile.file.id} className={styles.fileItem}>
							<div className={styles.fileName}>{groupFile.file.name}</div>
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
