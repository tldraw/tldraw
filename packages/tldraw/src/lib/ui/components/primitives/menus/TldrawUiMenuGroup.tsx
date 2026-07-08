import { TlColumn, TlGrid, TlRow, useTlOrientation } from '@tldraw/ui'
import { TlDropdownMenuGroup } from '@tldraw/ui'
import classNames from 'classnames'
import { ReactNode } from 'react'
import { unwrapLabel } from '../../../context/actions'
import { TLUiTranslationKey } from '../../../hooks/useTranslation/TLUiTranslationKey'
import { useDirection, useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { useTldrawUiMenuContext } from './TldrawUiMenuContext'

/** @public */
export interface TLUiMenuGroupProps<TranslationKey extends string = string> {
	id: string
	/**
	 * The label to display on the item. If it's a string, it will be translated. If it's an object, the keys will be used as the language keys and the values will be translated.
	 */
	label?: TranslationKey | { [key: string]: TranslationKey }
	className?: string
	children?: ReactNode
}

/** @public @react */
export function TldrawUiMenuGroup({ id, label, className, children }: TLUiMenuGroupProps) {
	const menu = useTldrawUiMenuContext()
	const { orientation } = useTlOrientation()
	const msg = useTranslation()
	const dir = useDirection()
	const labelToUse = unwrapLabel(label, menu.type)
	const labelStr = labelToUse ? msg(labelToUse as TLUiTranslationKey) : undefined

	switch (menu.type) {
		case 'menu': {
			return (
				<TlDropdownMenuGroup className={className} data-testid={`${menu.sourceId}-group.${id}`}>
					{children}
				</TlDropdownMenuGroup>
			)
		}
		case 'context-menu': {
			return (
				<div
					dir={dir}
					className={classNames('tlui-menu__group', className)}
					data-testid={`${menu.sourceId}-group.${id}`}
				>
					{children}
				</div>
			)
		}
		case 'keyboard-shortcuts': {
			// todo: if groups need a label, let's give em a label
			return (
				<div className="tlui-shortcuts-dialog__group" data-testid={`${menu.sourceId}-group.${id}`}>
					<h2 className="tlui-shortcuts-dialog__group__title">{labelStr}</h2>
					<div className="tlui-shortcuts-dialog__group__content">{children}</div>
				</div>
			)
		}
		case 'toolbar': {
			const Layout = orientation === 'horizontal' ? TlRow : TlColumn
			return (
				<Layout className="tlui-main-toolbar__group" data-testid={`${menu.sourceId}-group.${id}`}>
					{children}
				</Layout>
			)
		}
		case 'toolbar-overflow': {
			return (
				<TlGrid className="tlui-main-toolbar__group" data-testid={`${menu.sourceId}-group.${id}`}>
					{children}
				</TlGrid>
			)
		}
		default: {
			return children
		}
	}
}
