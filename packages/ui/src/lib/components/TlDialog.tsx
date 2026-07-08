import classNames from 'classnames'
import { Dialog as _Dialog } from 'radix-ui'
import { CSSProperties, ReactNode } from 'react'
import { TlPortalScope, useTlPortalContainer } from '../context/portal'
import { useTlTranslation } from '../context/translation'
import { TlButton, TlButtonIcon } from './TlButton'

/** @public */
export interface TlDialogHeaderProps {
	className?: string
	children: ReactNode
}

/** @public @react */
export function TlDialogHeader({ className, children }: TlDialogHeaderProps) {
	return <div className={classNames('tl-dialog__header', className)}>{children}</div>
}

/** @public */
export interface TlDialogTitleProps {
	className?: string
	children: ReactNode
	style?: CSSProperties
}

/** @public @react */
export function TlDialogTitle({ className, children, style }: TlDialogTitleProps) {
	const { dir } = useTlTranslation()

	return (
		<_Dialog.Title
			dir={dir}
			className={classNames('tl-dialog__header__title', className)}
			style={style}
		>
			{children}
		</_Dialog.Title>
	)
}

/** @public */
export interface TlDialogCloseButtonProps {
	/** Accessible label for the close button. @defaultValue 'Close' */
	closeLabel?: string
}

/** @public @react */
export function TlDialogCloseButton({ closeLabel }: TlDialogCloseButtonProps) {
	const { dir, msg } = useTlTranslation()
	const label = closeLabel ?? msg('ui.close', 'Close')

	return (
		<div className="tl-dialog__header__close">
			<_Dialog.Close data-testid="dialog.close" dir={dir} asChild>
				<TlButton
					type="icon"
					aria-label={label}
					onTouchEnd={(e) => (e.target as HTMLButtonElement).click()}
				>
					<TlButtonIcon small icon="cross-2" />
				</TlButton>
			</_Dialog.Close>
		</div>
	)
}

/** @public */
export interface TlDialogBodyProps {
	className?: string
	children: ReactNode
	style?: CSSProperties
}

/** @public @react */
export function TlDialogBody({ className, children, style }: TlDialogBodyProps) {
	return (
		<div className={classNames('tl-dialog__body', className)} style={style} tabIndex={0}>
			{children}
		</div>
	)
}

/** @public */
export interface TlDialogFooterProps {
	className?: string
	children?: ReactNode
}

/** @public @react */
export function TlDialogFooter({ className, children }: TlDialogFooterProps) {
	return <div className={classNames('tl-dialog__footer', className)}>{children}</div>
}

/** @public */
export interface TlDialogRootProps {
	children: ReactNode
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?(open: boolean): void
	/**
	 * When true, clicking outside the dialog does not close it. Escape still closes it.
	 */
	preventBackgroundClose?: boolean
}

/** @public @react */
export function TlDialogRoot({
	children,
	open,
	defaultOpen,
	onOpenChange,
	preventBackgroundClose,
}: TlDialogRootProps) {
	const container = useTlPortalContainer()
	const { dir } = useTlTranslation()

	return (
		<_Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
			<_Dialog.Portal container={container}>
				<TlPortalScope>
					<_Dialog.Overlay dir={dir} className="tl-dialog__overlay" />
					<div dir={dir} className="tl-dialog__positioner">
						<_Dialog.Content
							dir={dir}
							className="tl-dialog tl-dialog__content"
							aria-describedby={undefined}
							onInteractOutside={(e) => {
								if (preventBackgroundClose) {
									e.preventDefault()
								}
							}}
						>
							{children}
						</_Dialog.Content>
					</div>
				</TlPortalScope>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}
