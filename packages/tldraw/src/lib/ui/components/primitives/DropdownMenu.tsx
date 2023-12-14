import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { preventDefault, useContainer } from '@tldraw/editor'
import { useMenuIsOpen } from '../../hooks/useMenuIsOpen'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { Button, TLUiButtonProps } from './Button'
import { Icon } from './Icon'

/** @public */
export function Root({
	id,
	children,
	modal = false,
	debugOpen = false,
}: {
	id: string
	children: any
	modal?: boolean
	debugOpen?: boolean
}) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<DropdownMenu.Root open={debugOpen || open} dir="ltr" modal={modal} onOpenChange={onOpenChange}>
			{children}
		</DropdownMenu.Root>
	)
}

/** @public */
export function Trigger({
	children,
	'data-testid': testId,
}: {
	children: any
	'data-testid'?: string
}) {
	return (
		<DropdownMenu.Trigger
			dir="ltr"
			data-testid={testId}
			asChild
			// Firefox fix: Stop the dropdown immediately closing after touch
			onTouchEnd={(e) => preventDefault(e)}
		>
			{children}
		</DropdownMenu.Trigger>
	)
}

/** @public */
export function Content({
	side = 'bottom',
	align = 'start',
	sideOffset = 8,
	alignOffset = 8,
	children,
}: {
	children: any
	alignOffset?: number
	sideOffset?: number
	align?: 'start' | 'center' | 'end'
	side?: 'bottom' | 'top' | 'right' | 'left'
}) {
	const container = useContainer()

	return (
		<DropdownMenu.Portal container={container}>
			<DropdownMenu.Content
				className="tlui-menu"
				align={align}
				sideOffset={sideOffset}
				side={side}
				alignOffset={alignOffset}
				collisionPadding={4}
			>
				{children}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	)
}

/** @public */
export function Sub({ id, children }: { id: string; children: any }) {
	const [open, onOpenChange] = useMenuIsOpen(id)

	return (
		<DropdownMenu.Sub open={open} onOpenChange={onOpenChange}>
			{children}
		</DropdownMenu.Sub>
	)
}

/** @public */
export function SubTrigger({
	label,
	'data-testid': testId,
	'data-direction': dataDirection,
}: {
	label: TLUiTranslationKey | Exclude<string, TLUiTranslationKey>
	'data-testid'?: string
	'data-direction'?: 'left' | 'right'
}) {
	return (
		<DropdownMenu.SubTrigger dir="ltr" data-direction={dataDirection} data-testid={testId} asChild>
			<Button
				type="menu"
				className="tlui-menu__submenu__trigger"
				label={label}
				icon="chevron-right"
			/>
		</DropdownMenu.SubTrigger>
	)
}

/** @public */
export function SubContent({
	alignOffset = 0,
	sideOffset = 5,
	children,
}: {
	alignOffset?: number
	sideOffset?: number
	children: any
}) {
	const container = useContainer()
	return (
		<DropdownMenu.Portal container={container}>
			<DropdownMenu.SubContent
				className="tlui-menu tlui-menu__submenu__content"
				alignOffset={alignOffset}
				sideOffset={sideOffset}
				collisionPadding={4}
			>
				{children}
			</DropdownMenu.SubContent>
		</DropdownMenu.Portal>
	)
}

/** @public */
export function Group({
	children,
	size = 'medium',
}: {
	children: any
	size?: 'tiny' | 'small' | 'medium' | 'wide'
}) {
	return (
		<DropdownMenu.Group dir="ltr" className="tlui-menu__group" data-size={size}>
			{children}
		</DropdownMenu.Group>
	)
}

/** @public */
export function Indicator() {
	return (
		<DropdownMenu.ItemIndicator dir="ltr" asChild>
			<Icon icon="check" />
		</DropdownMenu.ItemIndicator>
	)
}

/** @public */
export interface DropdownMenuItemProps extends TLUiButtonProps {
	noClose?: boolean
}

/** @public */
export function Item({ noClose, ...props }: DropdownMenuItemProps) {
	return (
		<DropdownMenu.Item
			dir="ltr"
			asChild
			onClick={noClose || props.isChecked !== undefined ? preventDefault : undefined}
		>
			<Button {...props} />
		</DropdownMenu.Item>
	)
}

/** @public */
export interface DropdownMenuCheckboxItemProps {
	checked?: boolean
	onSelect?: (e: Event) => void
	disabled?: boolean
	title: string
	children: any
}

/** @public */
export function CheckboxItem({ children, onSelect, ...rest }: DropdownMenuCheckboxItemProps) {
	return (
		<DropdownMenu.CheckboxItem
			dir="ltr"
			className="tlui-button tlui-button__menu tlui-button__checkbox"
			onSelect={(e) => {
				onSelect?.(e)
				preventDefault(e)
			}}
			{...rest}
		>
			<Icon small icon={rest.checked ? 'check' : 'checkbox-empty'} />
			{children}
		</DropdownMenu.CheckboxItem>
	)
}

/** @public */
export function RadioItem({ children, onSelect, ...rest }: DropdownMenuCheckboxItemProps) {
	return (
		<DropdownMenu.CheckboxItem
			dir="ltr"
			className="tlui-button tlui-button__menu tlui-button__checkbox"
			onSelect={(e) => {
				onSelect?.(e)
				preventDefault(e)
			}}
			{...rest}
		>
			<div className="tlui-button__checkbox__indicator">
				<DropdownMenu.ItemIndicator dir="ltr">
					<Icon icon="check" small />
				</DropdownMenu.ItemIndicator>
			</div>
			{children}
		</DropdownMenu.CheckboxItem>
	)
}
