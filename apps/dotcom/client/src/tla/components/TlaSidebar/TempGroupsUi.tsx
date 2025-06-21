import { useNavigate } from 'react-router-dom'
import { uniqueId, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useHasFlag } from '../../hooks/useHasFlag'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './groups.module.css'

export function TempGroupsUi() {
	const hasGroupsFlag = useHasFlag('groups')
	const app = useApp()
	const navigate = useNavigate()

	const groupUsers = useValue('groupUsers', () => app.getGroupUsers(), [app])

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
			{groupUsers.map((group) => (
				<div key={group.groupId} className={styles.group}>
					<div className={styles.groupHeader}>
						<TlaIcon icon="group" />
						<div className={styles.groupName}>{group.group.name}</div>
						<button
							className={styles.membersButton}
							onClick={() => {
								window.alert(
									`Members:\n${group.groupMembers.map((u) => `${u.user.name} (${u.role})`).join('\n')}`
								)
							}}
						>
							{
								// eslint-disable-next-line react/jsx-no-literals
								'Members'
							}
						</button>
					</div>
					<div className={styles.fileList}>
						{group.groupFiles.map((groupFile) => {
							return groupFile.file ? (
								<div key={groupFile.file.id} className={styles.fileItem}>
									<div className={styles.fileName}>{groupFile.file.name}</div>
									<button
										className={styles.fileButton}
										onClick={() => {
											navigate(`/r/${groupFile.file.id}`)
										}}
									/>
								</div>
							) : null
						})}
					</div>
				</div>
			))}
		</div>
	)
}
