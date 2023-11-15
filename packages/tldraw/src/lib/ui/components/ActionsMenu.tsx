import * as PopoverPrimitive from '@radix-ui/react-popover'
import { useContainer } from '@tldraw/editor'
import { memo } from 'react'
import { TLUiMenuChild } from '../hooks/menuHelpers'
import { useActionsMenuSchema } from '../hooks/useActionsMenuSchema'
import { useReadonly } from '../hooks/useReadonly'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { Button } from './primitives/Button'
import { Popover, PopoverTrigger } from './primitives/Popover'
import { kbdStr } from './primitives/shared'

export const ActionsMenu = memo(function ActionsMenu() {
	const msg = useTranslation()
	const container = useContainer()
	const menuSchema = useActionsMenuSchema()
	const isReadonly = useReadonly()

	function getActionMenuItem(item: TLUiMenuChild) {
		if (!item) return null
		if (isReadonly && !item.readonlyOk) return null

		switch (item.type) {
			case 'item': {
				const { id, icon, label, kbd, onSelect } = item.actionItem

				return (
					<Button
						key={id}
						data-testid={`menu-item.${item.id}`}
						icon={icon}
						type="icon"
						title={
							label
								? kbd
									? `${msg(label)} ${kbdStr(kbd)}`
									: `${msg(label)}`
								: kbd
								? `${kbdStr(kbd)}`
								: ''
						}
						onClick={() => onSelect('actions-menu')}
						disabled={item.disabled}
					/>
				)
			}
		}
	}

	return (
		<Popover id="actions-menu">
			<PopoverTrigger>
				<Button
					className="tlui-menu__trigger"
					data-testid="main.action-menu"
					icon="dots-vertical"
					title={msg('actions-menu.title')}
					type="icon" // needs to be here because the trigger also passes down type="button"
					smallIcon
				/>
			</PopoverTrigger>
			<PopoverPrimitive.Portal container={container}>
				<PopoverPrimitive.Content
					className="tlui-popover__content"
					side="bottom"
					dir="ltr"
					sideOffset={6}
				>
					<div className="tlui-actions-menu tlui-buttons__grid">
						{menuSchema.map(getActionMenuItem)}
					</div>
				</PopoverPrimitive.Content>
			</PopoverPrimitive.Portal>
		</Popover>
	)
})
