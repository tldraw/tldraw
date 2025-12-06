import { useContainer, useEditor, usePeerIds, useValue } from '@tldraw/editor'
import { Popover as _Popover } from 'radix-ui'
import { ReactNode } from 'react'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { PeopleMenuAvatar } from './PeopleMenuAvatar'
import { PeopleMenuItem } from './PeopleMenuItem'
import { PeopleMenuMore } from './PeopleMenuMore'
import { UserPresenceEditor } from './UserPresenceEditor'

/** @public */
export interface PeopleMenuProps {
	children?: ReactNode
}

/** @public @react */
export function PeopleMenu({ children }: PeopleMenuProps) {
	const msg = useTranslation()

	const container = useContainer()
	const editor = useEditor()

	const userIds = usePeerIds()
	const userColor = useValue('user', () => editor.user.getColor(), [editor])
	const userName = useValue('user', () => editor.user.getName(), [editor])

	const [isOpen, onOpenChange] = useMenuIsOpen('people menu')
	const breakpoint = useBreakpoint()
	const maxAvatars = breakpoint <= PORTRAIT_BREAKPOINT.MOBILE_XS ? 1 : 5

	if (!userIds.length) return null

	return (
		<_Popover.Root onOpenChange={onOpenChange} open={isOpen}>
			<_Popover.Trigger dir="ltr" asChild>
				<button className="tlui-people-menu__avatars-button" title={msg('people-menu.title')}>
					<div className="tlui-people-menu__avatars">
						{userIds.slice(-maxAvatars).map((userId) => (
							<PeopleMenuAvatar key={userId} userId={userId} />
						))}
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
						{userIds.length > maxAvatars && <PeopleMenuMore count={userIds.length - maxAvatars} />}
					</div>
				</button>
			</_Popover.Trigger>
			<_Popover.Portal container={container}>
				<_Popover.Content
					dir="ltr"
					className="tlui-menu"
					side="bottom"
					sideOffset={2}
					collisionPadding={4}
				>
					<div className="tlui-people-menu__wrapper">
						<div className="tlui-people-menu__section">
							<UserPresenceEditor />
						</div>
						{userIds.length > 0 && (
							<div className="tlui-people-menu__section">
								{userIds.map((userId) => {
									return <PeopleMenuItem key={userId + '_presence'} userId={userId} />
								})}
							</div>
						)}
						{children}
					</div>
				</_Popover.Content>
			</_Popover.Portal>
		</_Popover.Root>
	)
}
