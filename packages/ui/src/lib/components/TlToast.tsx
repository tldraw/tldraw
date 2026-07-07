import classnames from 'classnames'
import { Toast as _Toast } from 'radix-ui'
import { ReactNode } from 'react'
import { useTlTranslation } from '../context/translation'
import { TlButton, TlButtonLabel } from './TlButton'
import { TlIcon } from './TlIcon'

const DEFAULT_TOAST_DURATION = 4000

/** @public */
export type TlToastSeverity = 'success' | 'info' | 'warning' | 'error'

const SEVERITY_TO_ICON: Record<TlToastSeverity, string> = {
	success: 'check-circle',
	warning: 'warning-triangle',
	error: 'cross-circle',
	info: 'info-circle',
}

const SEVERITY_TO_LABEL: Record<TlToastSeverity, string> = {
	success: 'Success',
	info: 'Info',
	warning: 'Warning',
	error: 'Error',
}

/** @public */
export interface TlToastAction {
	type: 'primary' | 'danger' | 'normal'
	label: string
	onClick(): void
}

/** @public */
export interface TlToastProviderProps {
	children: ReactNode
	swipeDirection?: 'right' | 'left' | 'up' | 'down'
	label?: string
	duration?: number
}

/** @public @react */
export function TlToastProvider({ children, ...props }: TlToastProviderProps) {
	return <_Toast.Provider {...props}>{children}</_Toast.Provider>
}

/** @public */
export interface TlToastProps {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?(open: boolean): void
	severity?: TlToastSeverity
	icon?: string
	iconLabel?: string
	title?: ReactNode
	description?: ReactNode
	actions?: TlToastAction[]
	keepOpen?: boolean
	closeLabel?: string
	duration?: number
}

/** @public @react */
export function TlToast({
	open,
	defaultOpen,
	onOpenChange,
	severity,
	icon,
	iconLabel,
	title,
	description,
	actions,
	keepOpen,
	closeLabel,
	duration,
}: TlToastProps) {
	const { msg } = useTlTranslation()

	const hasActions = actions && actions.length > 0

	const resolvedIcon = icon || (severity && SEVERITY_TO_ICON[severity])
	const resolvedIconLabel =
		iconLabel || (severity ? msg(`toast.${severity}`, SEVERITY_TO_LABEL[severity]) : '')

	const resolvedCloseLabel = closeLabel ?? msg('toast.close', 'Close')

	const severityClass = severity ? `tl-toast--${severity}` : undefined

	return (
		<_Toast.Root
			open={open}
			defaultOpen={defaultOpen}
			onOpenChange={onOpenChange}
			className={classnames('tl-toast', severityClass)}
			duration={keepOpen ? Infinity : (duration ?? DEFAULT_TOAST_DURATION)}
			data-severity={severity}
		>
			{resolvedIcon && (
				<div className="tl-toast__icon">
					<TlIcon label={resolvedIconLabel} icon={resolvedIcon} />
				</div>
			)}
			<div
				className="tl-toast__main"
				data-title={!!title}
				data-description={!!description}
				data-actions={!!actions}
			>
				<div className="tl-toast__content">
					{title && <_Toast.Title className="tl-toast__title">{title}</_Toast.Title>}
					{description && (
						<_Toast.Description className="tl-toast__description">{description}</_Toast.Description>
					)}
				</div>
				{actions && (
					<div className="tl-toast__actions">
						{actions.map((action, i) => (
							<_Toast.Action key={i} altText={action.label} asChild onClick={action.onClick}>
								<TlButton type={action.type}>
									<TlButtonLabel>{action.label}</TlButtonLabel>
								</TlButton>
							</_Toast.Action>
						))}
						<_Toast.Close asChild>
							<TlButton type="normal" className="tl-toast__close">
								<TlButtonLabel>{resolvedCloseLabel}</TlButtonLabel>
							</TlButton>
						</_Toast.Close>
					</div>
				)}
			</div>
			{!hasActions && (
				<_Toast.Close asChild>
					<TlButton type="normal" className="tl-toast__close">
						<TlButtonLabel>{resolvedCloseLabel}</TlButtonLabel>
					</TlButton>
				</_Toast.Close>
			)}
		</_Toast.Root>
	)
}

/** @public @react */
export function TlToastViewport() {
	return <_Toast.Viewport className="tl-toast__viewport" />
}
