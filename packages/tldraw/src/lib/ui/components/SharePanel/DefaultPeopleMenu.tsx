import { useContainer, useEditor, usePeerIds, useValue } from '@tldraw/editor'
import { Popover as _Popover } from 'radix-ui'
import { ReactNode } from 'react'
import { useTldrawUiComponents } from '../../context/components'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useDirection, useTranslation } from '../../hooks/useTranslation/useTranslation'
import { OfflineIndicator } from '../OfflineIndicator/OfflineIndicator'
import { DefaultPeopleMenuContent } from './DefaultPeopleMenuContent'

/** @public */
export interface DefaultPeopleMenuProps {
	children?: ReactNode
}

/** @public @react */
export function DefaultPeopleMenu({ children }: DefaultPeopleMenuProps) {
	const msg = useTranslation()
	const dir = useDirection()

	const container = useContainer()
	const editor = useEditor()

	const userIds = usePeerIds()
	const userColor = useValue('user', () => editor.user.getColor(), [editor])
	const userName = useValue('user', () => editor.user.getName(), [editor])

	const [isOpen, onOpenChange] = useMenuIsOpen('people menu')

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
		<_Popover.Root onOpenChange={onOpenChange} open={isOpen}>
			<_Popover.Trigger dir={dir} asChild>
				<button className="tlui-people-menu__avatars-button" title={msg('people-menu.title')}>
					{PeopleMenuFacePile ? (
						<PeopleMenuFacePile userColor={userColor} userIds={userIds} userName={userName} />
					) : null}
				</button>
			</_Popover.Trigger>
			<_Popover.Portal container={container}>
				<_Popover.Content
					dir={dir}
					className="tlui-menu"
					side="bottom"
					sideOffset={2}
					collisionPadding={4}
				>
					<div className="tlui-people-menu__wrapper">{content}</div>
				</_Popover.Content>
			</_Popover.Portal>
		</_Popover.Root>
	)
}
