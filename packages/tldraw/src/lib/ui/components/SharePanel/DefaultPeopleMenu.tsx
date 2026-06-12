import { Popover as _Popover } from '@base-ui/react/popover'
import { useContainer, useEditor, usePeerIds, useValue } from '@tldraw/editor'
import { ReactNode } from 'react'
import { useTldrawUiComponents } from '../../context/components'
import { useCollaborationStatus } from '../../hooks/useCollaborationStatus'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
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
			<_Popover.Trigger
				render={
					<button className="tlui-people-menu__avatars-button" title={msg('people-menu.title')}>
						{PeopleMenuFacePile ? (
							<PeopleMenuFacePile userColor={userColor} userIds={userIds} userName={userName} />
						) : null}
					</button>
				}
			/>
			<_Popover.Portal container={container}>
				<_Popover.Positioner
					className="tlui-popover__positioner"
					side="bottom"
					sideOffset={2}
					collisionPadding={4}
				>
					<_Popover.Popup className="tlui-menu">
						<div className="tlui-people-menu__wrapper">{content}</div>
					</_Popover.Popup>
				</_Popover.Positioner>
			</_Popover.Portal>
		</_Popover.Root>
	)
}
