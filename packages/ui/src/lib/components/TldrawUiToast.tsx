import classnames from 'classnames'
import { Toast as _Toast } from 'radix-ui'
import { ReactNode } from 'react'
import { useTldrawUiTranslation } from '../context/translation'
import { TldrawUiButton, TldrawUiButtonLabel } from './TldrawUiButton'
import { TldrawUiIcon } from './TldrawUiIcon'

const DEFAULT_TOAST_DURATION = 4000

/** @public */
export type TldrawUiToastSeverity = 'success' | 'info' | 'warning' | 'error'

const SEVERITY_TO_ICON: Record<TldrawUiToastSeverity, string> = {
	success: 'check-circle',
	warning: 'warning-triangle',
	error: 'cross-circle',
	info: 'info-circle',
}

const SEVERITY_TO_LABEL: Record<TldrawUiToastSeverity, string> = {
	success: 'Success',
	info: 'Info',
	warning: 'Warning',
	error: 'Error',
}

/** @public */
export interface TldrawUiToastAction {
	type: 'primary' | 'danger' | 'normal'
	label: string
	onClick(): void
}

/** @public */
export interface TldrawUiToastProviderProps {
	children: ReactNode
	swipeDirection?: 'right' | 'left' | 'up' | 'down'
	label?: string
	duration?: number
}

/** @public @react */
export function TldrawUiToastProvider({ children, ...props }: TldrawUiToastProviderProps) {
	return <_Toast.Provider {...props}>{children}</_Toast.Provider>
}

/** @public */
export interface TldrawUiToastProps {
	open?: boolean
	defaultOpen?: boolean
	onOpenChange?(open: boolean): void
	severity?: TldrawUiToastSeverity
	icon?: string
	iconLabel?: string
	title?: ReactNode
	description?: ReactNode
	actions?: TldrawUiToastAction[]
	keepOpen?: boolean
	closeLabel?: string
	duration?: number
}

/** @public @react */
export function TldrawUiToast({
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
}: TldrawUiToastProps) {
	const { msg } = useTldrawUiTranslation()

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
					<TldrawUiIcon label={resolvedIconLabel} icon={resolvedIcon} />
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
								<TldrawUiButton type={action.type}>
									<TldrawUiButtonLabel>{action.label}</TldrawUiButtonLabel>
								</TldrawUiButton>
							</_Toast.Action>
						))}
						<_Toast.Close asChild>
							<TldrawUiButton type="normal" className="tl-toast__close">
								<TldrawUiButtonLabel>{resolvedCloseLabel}</TldrawUiButtonLabel>
							</TldrawUiButton>
						</_Toast.Close>
					</div>
				)}
			</div>
			{!hasActions && (
				<_Toast.Close asChild>
					<TldrawUiButton type="normal" className="tl-toast__close">
						<TldrawUiButtonLabel>{resolvedCloseLabel}</TldrawUiButtonLabel>
					</TldrawUiButton>
				</_Toast.Close>
			)}
		</_Toast.Root>
	)
}

/** @public @react */
export function TldrawUiToastViewport() {
	return <_Toast.Viewport className="tl-toast__viewport" />
}
