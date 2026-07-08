import { useEditor, usePeerIds, useValue } from '@tldraw/editor'
import { TlPopover, TlPopoverContent, TlPopoverTrigger } from '@tldraw/ui'
import { ReactNode } from 'react'
import { useTldrawUiComponents } from '../../context/components'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { OfflineIndicator } from '../OfflineIndicator/OfflineIndicator'
import { DefaultPeopleMenuContent } from './DefaultPeopleMenuContent'

/** @public */
export interface DefaultPeopleMenuProps {
	children?: ReactNode
}

/** @public @react */
export function DefaultPeopleMenu({ children }: DefaultPeopleMenuProps) {
	const msg = useTranslation()

	const editor = useEditor()

	const userIds = usePeerIds()
	const userColor = useValue('user', () => editor.user.getColor(), [editor])
	const userName = useValue('user', () => editor.user.getName(), [editor])

	const collaborationStatus = useCollaborationStatus()

	const { PeopleMenuFacePile } = useTldrawUiComponents()

	if (collaborationStatus === 'offline') {
		return <OfflineIndicator />
	}

	if (!userIds.length || (!children && !PeopleMenuFacePile)) {
		return null
	}

	const content = children ?? <DefaultPeopleMenuContent userIds={userIds} />

	return (
		<TlPopover id="people menu">
			<TlPopoverTrigger>
				<button className="tlui-people-menu__avatars-button" title={msg('people-menu.title')}>
					{PeopleMenuFacePile ? (
						<PeopleMenuFacePile userColor={userColor} userIds={userIds} userName={userName} />
					) : null}
				</button>
			</TlPopoverTrigger>
			<TlPopoverContent side="bottom" sideOffset={2} collisionPadding={4}>
				<div className="tlui-people-menu__wrapper">{content}</div>
			</TlPopoverContent>
		</TlPopover>
	)
}
