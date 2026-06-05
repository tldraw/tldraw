import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useTldrawUiComponents } from '../../context/components'

/** @public */
export interface TLUiPeopleMenuFacePileProps {
	userIds: string[]
	userName: string
	userColor: string
}

/** @public @react */
export function DefaultPeopleMenuFacePile({
	userIds,
	userName,
	userColor,
}: TLUiPeopleMenuFacePileProps) {
	const { PeopleMenuAvatar } = useTldrawUiComponents()

	const breakpoint = useBreakpoint()
	const maxAvatars = breakpoint <= PORTRAIT_BREAKPOINT.MOBILE_XS ? 1 : 5

	return (
		<div className="tlui-people-menu__avatars">
			{PeopleMenuAvatar &&
				userIds
					.slice(-maxAvatars)
					.map((userId) => <PeopleMenuAvatar key={userId} userId={userId} />)}
			{userIds.length > 0 && (
				<div
					className="tlui-people-menu__avatar"
					style={{
						backgroundColor: userColor,
					}}
				>
					{userName?.[0] ?? ''}
				</div>
			)}
			{userIds.length > maxAvatars && (
				<div className="tlui-people-menu__avatar tlui-people-menu__more">
					{Math.abs(userIds.length - maxAvatars)}
				</div>
			)}
		</div>
	)
}
