import classNames from 'classnames'
import { forwardRef, HTMLAttributes, ReactNode } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonIcon,
	TldrawUiButtonLabel,
	TldrawUiInput,
	TLUiInputProps,
	useTranslation,
} from 'tldraw'
import styles from './top.module.css'

/*
 * The list a header crumb opens: the workspace switcher and the file switcher. It is built from
 * the page menu's own `tlui-page-menu__*` classes so the three popovers match, and this file is the
 * only place in the app that uses them: if tldraw changes those styles, this is what to revisit.
 */

// DefaultPageMenu's row pitch and the space it leaves under the last row. Its rows are 40px tall
// and positioned absolutely, overlapping by the 4px their highlight is inset.
const ROW_PITCH = 36
const LIST_BOTTOM_PADDING = 4

export const SWITCHER_TRIGGER_CLASS_NAME = 'tlui-page-menu__trigger'

export function TlaSwitcherList({
	rowCount,
	createLabel,
	createTestId,
	onCreate,
	children,
	...rest
}: {
	rowCount: number
	createLabel: string
	createTestId: string
	onCreate(): void
	children: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
	return (
		<div className="tlui-page-menu__wrapper">
			<div {...rest} className={classNames('tlui-page-menu__list', styles.switcherList)}>
				<div
					className="tlui-page-menu__list__content"
					style={{ height: rowCount * ROW_PITCH + LIST_BOTTOM_PADDING }}
				>
					{children}
				</div>
			</div>
			<div className={styles.switcherDivider} />
			<TldrawUiButton
				type="menu"
				className="tlui-page-menu__create-button"
				data-testid={createTestId}
				onClick={onCreate}
			>
				<TldrawUiButtonLabel>{createLabel}</TldrawUiButtonLabel>
				<TldrawUiButtonIcon icon="plus" small />
			</TldrawUiButton>
		</div>
	)
}

export function TlaSwitcherRow({
	index,
	isCurrent,
	isEditing,
	children,
	...rest
}: {
	index: number
	isCurrent: boolean
	isEditing?: boolean
	children: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			{...rest}
			className="tlui-page-menu__item"
			data-iscurrent={isCurrent}
			data-editing={!!isEditing}
			style={{ transform: `translateY(${index * ROW_PITCH}px)` }}
		>
			{children}
		</div>
	)
}

export function TlaSwitcherRowButton({
	children,
	...rest
}: { children: ReactNode } & HTMLAttributes<HTMLButtonElement>) {
	return (
		<TldrawUiButton {...rest} type="normal" className="tlui-page-menu__item__button notranslate">
			<TldrawUiButtonLabel>{children}</TldrawUiButtonLabel>
		</TldrawUiButton>
	)
}

/** Holds a row's ⋮ menu, which shows on hover like a page row's. */
export function TlaSwitcherRowMenu({ children }: { children: ReactNode }) {
	return <div className="tlui-page-menu__item__submenu">{children}</div>
}

/** The ⋮ button for {@link TlaSwitcherRowMenu}. Forwards its ref and props so a menu can use it as its trigger. */
export const TlaSwitcherRowMenuTrigger = forwardRef<
	HTMLButtonElement,
	HTMLAttributes<HTMLButtonElement>
>(function TlaSwitcherRowMenuTrigger(props, ref) {
	const msg = useTranslation()
	const label = msg('page-menu.submenu.title')
	return (
		<TldrawUiButton {...props} ref={ref} type="icon" tooltip={label} title={label}>
			<TldrawUiButtonIcon icon="dots-vertical" small />
		</TldrawUiButton>
	)
})

/** A row's name being edited in place. */
export function TlaSwitcherRowInput(props: TLUiInputProps) {
	return (
		<div className="tlui-page-menu__item__title">
			<TldrawUiInput {...props} className="tlui-page-menu__item__input" autoFocus autoSelect />
		</div>
	)
}
