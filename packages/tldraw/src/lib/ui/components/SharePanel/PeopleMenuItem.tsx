import { track, useEditor, usePresence } from '@tldraw/editor'
import { useCallback } from 'react'
import { useUiEvents } from '../../context/events'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import { TldrawUiRow } from '../primitives/layout'

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
			trackEvent('start-following', { source: 'people-menu' })
		}
	}, [editor, userId, trackEvent])

	const theyAreFollowingYou = presence?.followingUserId === editor.user.getId()
	const youAreFollowingThem = editor.getInstanceState().followingUserId === userId

	if (!presence) return null

	return (
		<TldrawUiRow
			className="tlui-people-menu__item"
			data-follow={youAreFollowingThem || theyAreFollowingYou}
		>
			<TldrawUiButton
				type="menu"
				className="tlui-people-menu__item__button"
				onClick={() => editor.zoomToUser(userId)}
				onDoubleClick={handleFollowClick}
			>
				<TldrawUiIcon label={msg('people-menu.avatar-color')} icon="color" color={presence.color} />
				<div className="tlui-people-menu__name">
					{presence.userName?.trim() || msg('people-menu.anonymous-user')}
				</div>
			</TldrawUiButton>
			<TldrawUiButton
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
				<TldrawUiButtonIcon
					icon={theyAreFollowingYou ? 'leading' : youAreFollowingThem ? 'following' : 'follow'}
				/>
			</TldrawUiButton>
		</TldrawUiRow>
	)
})
