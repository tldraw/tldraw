import * as Popover from '@radix-ui/react-popover'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	track,
	useContainer,
	useEditor,
	useMenuIsOpen,
	usePeerIds,
	useTranslation,
	useValue,
} from 'tldraw'
import { PeopleMenuAvatar } from './PeopleMenuAvatar'
import { PeopleMenuItem } from './PeopleMenuItem'
import { PeopleMenuMore } from './PeopleMenuMore'
import { UserPresenceEditor } from './UserPresenceEditor'

/** @public */
export const PeopleMenu = track(function PeopleMenu({
	hideShareMenu,
}: {
	hideShareMenu?: boolean
}) {
	const msg = useTranslation()

	const container = useContainer()
	const editor = useEditor()

	const userIds = usePeerIds()
	const userColor = useValue('user', () => editor.user.getColor(), [editor])
	const userName = useValue('user', () => editor.user.getName(), [editor])

	const [isOpen, onOpenChange] = useMenuIsOpen('people menu')

	return (
		<Popover.Root onOpenChange={onOpenChange} open={isOpen}>
			<Popover.Trigger dir="ltr" asChild>
				<button className="tlui-people-menu__avatars-button" title={msg('people-menu.title')}>
					{userIds.length > 5 && <PeopleMenuMore count={userIds.length - 5} />}
					<div className="tlui-people-menu__avatars">
						{userIds.slice(-5).map((userId) => (
							<PeopleMenuAvatar key={userId} userId={userId} />
						))}
						<div
							className="tlui-people-menu__avatar"
							style={{
								backgroundColor: userColor,
							}}
						>
							{userName === 'New User' ? '' : userName[0] ?? ''}
						</div>
					</div>
				</button>
			</Popover.Trigger>
			<Popover.Portal container={container}>
				<Popover.Content
					dir="ltr"
					className="tlui-menu"
					align="end"
					side="bottom"
					sideOffset={2}
					alignOffset={-5}
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
						{!hideShareMenu && (
							<div className="tlui-people-menu__section">
								<TldrawUiButton
									type="menu"
									data-testid="people-menu.invite"
									onClick={() => editor.addOpenMenu('share menu')}
								>
									<TldrawUiButtonLabel>{msg('people-menu.invite')}</TldrawUiButtonLabel>
									<TldrawUiButtonIcon icon="plus" />
								</TldrawUiButton>
							</div>
						)}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	)
})
