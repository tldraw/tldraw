import { useTldrawUiComponents } from '../../context/components'

/** @public */
export interface DefaultPeopleMenuContentProps {
	userIds: string[]
}

/** @public @react */
export function DefaultPeopleMenuContent({ userIds }: DefaultPeopleMenuContentProps) {
	const { PeopleMenuItem, UserPresenceEditor } = useTldrawUiComponents()

	return (
		<>
			{UserPresenceEditor && (
				<div className="tlui-people-menu__section">
					<UserPresenceEditor />
				</div>
			)}
			{PeopleMenuItem && userIds.length > 0 && (
				<div className="tlui-people-menu__section">
					{userIds.map((userId) => {
						return <PeopleMenuItem key={userId + '_presence'} userId={userId} />
					})}
				</div>
			)}
		</>
	)
}
