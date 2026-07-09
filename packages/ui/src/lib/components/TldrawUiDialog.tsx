import classNames from 'classnames'
import { Dialog as _Dialog } from 'radix-ui'
import { CSSProperties, ReactNode } from 'react'
import { TldrawUiPortalScope, useTldrawUiPortalContainer } from '../context/portal'
import { useTldrawUiTranslation } from '../context/translation'
import { TldrawUiButton, TldrawUiButtonIcon } from './TldrawUiButton'

/** @public */
export interface TldrawUiDialogHeaderProps {
	className?: string
	children: ReactNode
}

/** @public @react */
export function TldrawUiDialogHeader({ className, children }: TldrawUiDialogHeaderProps) {
	return <div className={classNames('tl-dialog__header', className)}>{children}</div>
}

/** @public */
export interface TldrawUiDialogTitleProps {
	className?: string
	children: ReactNode
	style?: CSSProperties
}

/** @public @react */
export function TldrawUiDialogTitle({ className, children, style }: TldrawUiDialogTitleProps) {
	const { dir } = useTldrawUiTranslation()

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
export interface TldrawUiDialogCloseButtonProps {
	/** Accessible label for the close button. @defaultValue 'Close' */
	closeLabel?: string
}

/** @public @react */
export function TldrawUiDialogCloseButton({ closeLabel }: TldrawUiDialogCloseButtonProps) {
	const { dir, msg } = useTldrawUiTranslation()
	const label = closeLabel ?? msg('ui.close', 'Close')

	return (
		<div className="tl-dialog__header__close">
			<_Dialog.Close data-testid="dialog.close" dir={dir} asChild>
				<TldrawUiButton
					type="icon"
					aria-label={label}
					onTouchEnd={(e) => (e.target as HTMLButtonElement).click()}
				>
					<TldrawUiButtonIcon small icon="cross-2" />
				</TldrawUiButton>
			</_Dialog.Close>
		</div>
	)
}

/** @public */
export interface TldrawUiDialogBodyProps {
	className?: string
	children: ReactNode
	style?: CSSProperties
}

/** @public @react */
export function TldrawUiDialogBody({ className, children, style }: TldrawUiDialogBodyProps) {
	return (
		<div className={classNames('tl-dialog__body', className)} style={style} tabIndex={0}>
			{children}
		</div>
	)
}

/** @public */
export interface TldrawUiDialogFooterProps {
	className?: string
	children?: ReactNode
}

/** @public @react */
export function TldrawUiDialogFooter({ className, children }: TldrawUiDialogFooterProps) {
	return <div className={classNames('tl-dialog__footer', className)}>{children}</div>
}

/** @public */
export interface TldrawUiDialogRootProps {
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
export function TldrawUiDialogRoot({
	children,
	open,
	defaultOpen,
	onOpenChange,
	preventBackgroundClose,
}: TldrawUiDialogRootProps) {
	const container = useTldrawUiPortalContainer()
	const { dir } = useTldrawUiTranslation()

	return (
		<_Dialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
			<_Dialog.Portal container={container}>
				<TldrawUiPortalScope>
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
				</TldrawUiPortalScope>
			</_Dialog.Portal>
		</_Dialog.Root>
	)
}
