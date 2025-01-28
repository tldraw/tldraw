import * as _Dialog from '@radix-ui/react-dialog'
import classNames from 'classnames'
import { CSSProperties, ReactNode } from 'react'
import { TldrawUiButton } from './Button/TldrawUiButton'
import { TldrawUiButtonIcon } from './Button/TldrawUiButtonIcon'

/** @public */
export interface TLUiDialogHeaderProps {
	className?: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDialogHeader({ className, children }: TLUiDialogHeaderProps) {
	return <div className={classNames('tlui-dialog__header', className)}>{children}</div>
}

/** @public */
export interface TLUiDialogTitleProps {
	className?: string
	children: ReactNode
	style?: CSSProperties
}

/** @public @react */
export function TldrawUiDialogTitle({ className, children, style }: TLUiDialogTitleProps) {
	return (
		<_Dialog.Title
			dir="ltr"
			className={classNames('tlui-dialog__header__title', className)}
			style={style}
		>
			{children}
		</_Dialog.Title>
	)
}

/** @public @react */
export function TldrawUiDialogCloseButton() {
	return (
		<div className="tlui-dialog__header__close">
			<_Dialog.DialogClose data-testid="dialog.close" dir="ltr" asChild>
				<TldrawUiButton
					type="icon"
					aria-label="Close"
					onTouchEnd={(e) => (e.target as HTMLButtonElement).click()}
				>
					<TldrawUiButtonIcon small icon="cross-2" />
				</TldrawUiButton>
			</_Dialog.DialogClose>
		</div>
	)
}

/** @public */
export interface TLUiDialogBodyProps {
	className?: string
	children: ReactNode
	style?: CSSProperties
}

/** @public @react */
export function TldrawUiDialogBody({ className, children, style }: TLUiDialogBodyProps) {
	return (
		<div className={classNames('tlui-dialog__body', className)} style={style}>
			{children}
		</div>
	)
}

/** @public */
export interface TLUiDialogFooterProps {
	className?: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDialogFooter({ className, children }: TLUiDialogFooterProps) {
	return <div className={classNames('tlui-dialog__footer', className)}>{children}</div>
}
