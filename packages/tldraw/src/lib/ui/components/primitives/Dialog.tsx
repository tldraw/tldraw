import * as _Dialog from '@radix-ui/react-dialog'
import classNames from 'classnames'
import { Button } from './Button'
import { Icon } from './Icon'

/** @public */
export type TLUiDialogHeaderProps = {
	className?: string
	children: any
}

/** @public */
export function DialogHeader({ className, children }: TLUiDialogHeaderProps) {
	return <div className={classNames('tlui-dialog__header', className)}>{children}</div>
}

/** @public */
export type TLUiDialogTitleProps = {
	className?: string
	children: any
}

/** @public */
export function DialogTitle({ className, children }: TLUiDialogTitleProps) {
	return (
		<_Dialog.DialogTitle dir="ltr" className={classNames('tlui-dialog__header__title', className)}>
			{children}
		</_Dialog.DialogTitle>
	)
}

/** @public */
export function DialogCloseButton() {
	return (
		<div className="tlui-dialog__header__close">
			<_Dialog.DialogClose data-testid="dialog.close" dir="ltr" asChild>
				<Button
					type="icon"
					aria-label="Close"
					onTouchEnd={(e) => (e.target as HTMLButtonElement).click()}
				>
					<Icon small icon="cross-2" />
				</Button>
			</_Dialog.DialogClose>
		</div>
	)
}

/** @public */
export type TLUiDialogBodyProps = {
	className?: string
	children: any
	style?: React.CSSProperties
}

/** @public */
export function DialogBody({ className, children, style }: TLUiDialogBodyProps) {
	return (
		<div className={classNames('tlui-dialog__body', className)} style={style}>
			{children}
		</div>
	)
}

/** @public */
export type TLUiDialogFooterProps = {
	className?: string
	children: any
}

/** @public */
export function DialogFooter({ className, children }: TLUiDialogFooterProps) {
	return <div className={classNames('tlui-dialog__footer', className)}>{children}</div>
}
