import * as _Dialog from '@radix-ui/react-dialog'
import classNames from 'classnames'
import { Button } from './Button'
import { Icon } from './Icon'

/** @public */
export function Header({ className, children }: { className?: string; children: any }) {
	return <div className={classNames('tlui-dialog__header', className)}>{children}</div>
}

/** @public */
export function Title({ className, children }: { className?: string; children: any }) {
	return (
		<_Dialog.DialogTitle dir="ltr" className={classNames('tlui-dialog__header__title', className)}>
			{children}
		</_Dialog.DialogTitle>
	)
}

/** @public */
export function CloseButton() {
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
export function Body({
	className,
	children,
	style,
}: {
	className?: string
	children: any
	style?: React.CSSProperties
}) {
	return (
		<div className={classNames('tlui-dialog__body', className)} style={style}>
			{children}
		</div>
	)
}

/** @public */
export function Footer({ className, children }: { className?: string; children: any }) {
	return <div className={classNames('tlui-dialog__footer', className)}>{children}</div>
}
