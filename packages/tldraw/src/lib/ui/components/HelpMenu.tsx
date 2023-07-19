import { Content, Portal, Root, Trigger } from '@radix-ui/react-dropdown-menu'
import { useContainer } from '@tldraw/editor'
import * as React from 'react'
import { TLUiMenuChild } from '../hooks/menuHelpers'
import { useHelpMenuSchema } from '../hooks/useHelpMenuSchema'
import { useMenuIsOpen } from '../hooks/useMenuIsOpen'
import { useReadonly } from '../hooks/useReadonly'
import { TLUiTranslationKey } from '../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../icon-types'
import { LanguageMenu } from './LanguageMenu'
import * as M from './primitives/DropdownMenu'
import { Icon } from './primitives/Icon'

interface HelpMenuLink {
	label: TLUiTranslationKey
	icon: TLUiIconType
	url: string
}

/** @internal */
export interface HelpMenuProps {
	links?: HelpMenuLink[]
}

/** @internal */
export const HelpMenu = React.memo(function HelpMenu() {
	const container = useContainer()
	const msg = useTranslation()
	const [isOpen, onOpenChange] = useMenuIsOpen('help menu')

	return (
		<div className="tlui-help-menu">
			<Root dir="ltr" open={isOpen} onOpenChange={onOpenChange} modal={false}>
				<Trigger
					className="tlui-button tlui-help-menu__button"
					dir="ltr"
					title={msg('help-menu.title')}
				>
					<Icon icon="question-mark" />
				</Trigger>
				<Portal container={container} dir="ltr">
					<Content
						className="tlui-menu"
						side="top"
						sideOffset={8}
						align="end"
						alignOffset={0}
						collisionPadding={4}
					>
						<HelpMenuContent />
					</Content>
				</Portal>
			</Root>
		</div>
	)
})

function HelpMenuContent() {
	const menuSchema = useHelpMenuSchema()

	const isReadonly = useReadonly()

	function getHelpMenuItem(item: TLUiMenuChild) {
		if (isReadonly && !item.readonlyOk) return null

		switch (item.type) {
			case 'custom': {
				if (item.id === 'LANGUAGE_MENU') {
					return <LanguageMenu key="item" />
				}
				break
			}
			case 'group': {
				return (
					<M.Group size="small" key={item.id}>
						{item.children.map(getHelpMenuItem)}
					</M.Group>
				)
			}
			case 'submenu': {
				return (
					<M.Sub id={`help menu ${item.id}`} key={item.id}>
						<M.SubTrigger label={item.label} />
						<M.SubContent>{item.children.map(getHelpMenuItem)}</M.SubContent>
					</M.Sub>
				)
			}
			case 'item': {
				const { id, kbd, label, onSelect, icon } = item.actionItem
				return (
					<M.Item
						key={id}
						kbd={kbd}
						label={label}
						onClick={() => onSelect('help-menu')}
						iconLeft={icon}
					/>
				)
			}
		}
	}

	return <>{menuSchema.map(getHelpMenuItem)}</>
}
