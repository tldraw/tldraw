import {
	Button,
	Icon,
	track,
	useEditor,
	usePresence,
	useTranslation,
	useUiEvents,
} from '@tldraw/tldraw'
import { useCallback } from 'react'
import { UI_OVERRIDE_TODO_EVENT } from '../../utils/useHandleUiEvent'

export const PeopleMenuItem = track(function PeopleMenuItem({ userId }: { userId: string }) {
	const editor = useEditor()
	const msg = useTranslation()
	const trackEvent = useUiEvents()

	const presence = usePresence(userId)

	const handleFollowClick = useCallback(() => {
		if (editor.getInstanceState().followingUserId === userId) {
			editor.stopFollowingUser()
			trackEvent('stop-following', { source: 'people-menu' })
		} else {
			editor.startFollowingUser(userId)
			trackEvent('start-following' as UI_OVERRIDE_TODO_EVENT, { source: 'people-menu' })
		}
	}, [editor, userId, trackEvent])

	const theyAreFollowingYou = presence?.followingUserId === editor.user.getId()
	const youAreFollowingThem = editor.getInstanceState().followingUserId === userId

	if (!presence) return null

	return (
		<div className="tlui-people-menu__item tlui-buttons__horizontal">
			<Button
				type="menu"
				className="tlui-people-menu__item__button"
				onClick={() => editor.animateToUser(userId)}
				onDoubleClick={handleFollowClick}
			>
				<Icon icon="color" color={presence.color} />
				<div className="tlui-people-menu__name">{presence.userName ?? 'New User'}</div>
			</Button>
			<Button
				type="icon"
				className="tlui-people-menu__item__follow"
				title={
					theyAreFollowingYou
						? msg('people-menu.leading')
						: youAreFollowingThem
							? msg('people-menu.following')
							: msg('people-menu.follow')
				}
				icon={theyAreFollowingYou ? 'leading' : youAreFollowingThem ? 'following' : 'follow'}
				onClick={handleFollowClick}
				disabled={theyAreFollowingYou}
				data-active={youAreFollowingThem || theyAreFollowingYou}
			/>
		</div>
	)
})
