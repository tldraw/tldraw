import { defineMessages, TLUserId, track, useEditor, usePresence } from '@tldraw/editor'
import { useCallback } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	peopleMenuAnonymousUser: { id: 'people-menu.anonymous-user', defaultMessage: 'New user' },
	peopleMenuAvatarColor: { id: 'people-menu.avatar-color', defaultMessage: 'Avatar color' },
	peopleMenuFollow: { id: 'people-menu.follow', defaultMessage: 'Following' },
	peopleMenuFollowing: { id: 'people-menu.following', defaultMessage: 'Following' },
	peopleMenuLeading: { id: 'people-menu.leading', defaultMessage: 'Following you' },
})

/** @public */
export interface TLUiPeopleMenuItemProps {
	userId: TLUserId
}

/** @public @react */
export const DefaultPeopleMenuItem = track(function DefaultPeopleMenuItem({
	userId,
}: TLUiPeopleMenuItemProps) {
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
			trackEvent('start-following', { source: 'people-menu' })
		}
	}, [editor, userId, trackEvent])

	const theyAreFollowingYou = presence?.followingUserId === editor.user.getRecordId()
	const youAreFollowingThem = editor.getInstanceState().followingUserId === userId

	if (!presence) return null

	return (
		<div
			className="tlui-people-menu__item"
			data-follow={youAreFollowingThem || theyAreFollowingYou}
		>
			<TldrawUiButton
				type="menu"
				className="tlui-people-menu__item__button"
				onClick={() => editor.zoomToUser(userId)}
				onDoubleClick={handleFollowClick}
			>
				<TldrawUiIcon
					label={msg(messages.peopleMenuAvatarColor.id)}
					icon="color"
					color={presence.color}
				/>
				<div className="tlui-people-menu__name">
					{presence.userName?.trim() || msg(messages.peopleMenuAnonymousUser.id)}
				</div>
			</TldrawUiButton>
			<TldrawUiButton
				type="icon"
				className="tlui-people-menu__item__follow"
				title={
					theyAreFollowingYou
						? msg(messages.peopleMenuLeading.id)
						: youAreFollowingThem
							? msg(messages.peopleMenuFollowing.id)
							: msg(messages.peopleMenuFollow.id)
				}
				onClick={handleFollowClick}
				disabled={theyAreFollowingYou}
			>
				<TldrawUiButtonIcon
					icon={theyAreFollowingYou ? 'leading' : youAreFollowingThem ? 'following' : 'follow'}
				/>
			</TldrawUiButton>
		</div>
	)
})
