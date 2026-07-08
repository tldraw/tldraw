import { TLUserId, track, useEditor, usePresence } from '@tldraw/editor'
import { TlButton } from '@tldraw/ui'
import { TlButtonIcon } from '@tldraw/ui'
import { TlRow } from '@tldraw/ui'
import { TlIcon } from '@tldraw/ui'
import { useCallback } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'

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
		<TlRow
			className="tlui-people-menu__item"
			data-follow={youAreFollowingThem || theyAreFollowingYou}
		>
			<TlButton
				type="menu"
				className="tlui-people-menu__item__button"
				onClick={() => editor.zoomToUser(userId)}
				onDoubleClick={handleFollowClick}
			>
				<TlIcon label={msg('people-menu.avatar-color')} icon="color" color={presence.color} />
				<div className="tlui-people-menu__name">
					{presence.userName?.trim() || msg('people-menu.anonymous-user')}
				</div>
			</TlButton>
			<TlButton
				type="icon"
				className="tlui-people-menu__item__follow"
				title={
					theyAreFollowingYou
						? msg('people-menu.leading')
						: youAreFollowingThem
							? msg('people-menu.following')
							: msg('people-menu.follow')
				}
				onClick={handleFollowClick}
				disabled={theyAreFollowingYou}
			>
				<TlButtonIcon
					icon={theyAreFollowingYou ? 'leading' : youAreFollowingThem ? 'following' : 'follow'}
				/>
			</TlButton>
		</TlRow>
	)
})
