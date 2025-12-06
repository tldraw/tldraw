import { useValue } from '@tldraw/editor'
import { Toast as _Toast } from 'radix-ui'
import { memo } from 'react'
import { AlertSeverity, TLUiToast, useToasts } from '../context/toasts'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../icon-types'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from './primitives/Button/TldrawUiButtonLabel'
import { TldrawUiIcon } from './primitives/TldrawUiIcon'

const DEFAULT_TOAST_DURATION = 4000

const SEVERITY_TO_ICON: { [msg in AlertSeverity]: TLUiIconType } = {
	success: 'check-circle',
	warning: 'warning-triangle',
	error: 'cross-circle',
	info: 'info-circle',
}

/** @internal */
function TldrawUiToast({ toast }: { toast: TLUiToast }) {
	const { removeToast } = useToasts()
	const msg = useTranslation()

	const onOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			removeToast(toast.id)
		}
	}

	const hasActions = toast.actions && toast.actions.length > 0

	const icon = toast.icon || (toast.severity && SEVERITY_TO_ICON[toast.severity])
	const iconLabel = toast.iconLabel || (toast.severity ? msg(`toast.${toast.severity}`) : '')

	return (
		<_Toast.Root
			onOpenChange={onOpenChange}
			className="tlui-toast__container"
			duration={toast.keepOpen ? Infinity : DEFAULT_TOAST_DURATION}
			data-severity={toast.severity}
		>
			{icon && (
				<div className="tlui-toast__icon">
					<TldrawUiIcon label={iconLabel} icon={icon} />
				</div>
			)}
			<div
				className="tlui-toast__main"
				data-title={!!toast.title}
				data-description={!!toast.description}
				data-actions={!!toast.actions}
			>
				<div className="tlui-toast__content">
					{toast.title && <_Toast.Title className="tlui-toast__title">{toast.title}</_Toast.Title>}
					{toast.description && (
						<_Toast.Description className="tlui-toast__description">
							{toast.description}
						</_Toast.Description>
					)}
				</div>
				{toast.actions && (
					<div className="tlui-toast__actions">
						{toast.actions.map((action, i) => (
							<_Toast.Action key={i} altText={action.label} asChild onClick={action.onClick}>
								<TldrawUiButton type={action.type}>
									<TldrawUiButtonLabel>{action.label}</TldrawUiButtonLabel>
								</TldrawUiButton>
							</_Toast.Action>
						))}
						<_Toast.Close asChild>
							<TldrawUiButton
								type="normal"
								className="tlui-toast__close"
								style={{ marginLeft: 'auto' }}
							>
								<TldrawUiButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TldrawUiButtonLabel>
							</TldrawUiButton>
						</_Toast.Close>
					</div>
				)}
			</div>
			{!hasActions && (
				<_Toast.Close asChild>
					<TldrawUiButton type="normal" className="tlui-toast__close">
						<TldrawUiButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TldrawUiButtonLabel>
					</TldrawUiButton>
				</_Toast.Close>
			)}
		</_Toast.Root>
	)
}

/** @public @react */
export const DefaultToasts = memo(function TldrawUiToasts() {
	const { toasts } = useToasts()
	const toastsArray = useValue('toasts', () => toasts.get(), [])
	return (
		<>
			{toastsArray.map((toast) => (
				<TldrawUiToast key={toast.id} toast={toast} />
			))}
			<_Toast.ToastViewport className="tlui-toast__viewport" />
		</>
	)
})
