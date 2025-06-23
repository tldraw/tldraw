import { uniqueId, useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useHasFlag } from '../../hooks/useHasFlag'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { GroupItem } from './GroupItem'
import styles from './groups.module.css'

export function TempGroupsUi() {
	const hasGroupsFlag = useHasFlag('groups')
	const app = useApp()

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
				<GroupItem key={group.groupId} id={group.groupId} />
			))}
		</div>
	)
}
