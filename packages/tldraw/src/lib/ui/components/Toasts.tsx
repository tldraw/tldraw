import { useValue } from '@tldraw/editor'
import { TlButton } from '@tldraw/ui'
import { TlButtonLabel } from '@tldraw/ui'
import { TlIcon } from '@tldraw/ui'
import { Toast as _Toast } from 'radix-ui'
import { memo } from 'react'
import { AlertSeverity, TLUiToast, useToasts } from '../context/toasts'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../icon-types'

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
					<TlIcon label={iconLabel} icon={icon} />
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
								<TlButton type={action.type}>
									<TlButtonLabel>{action.label}</TlButtonLabel>
								</TlButton>
							</_Toast.Action>
						))}
						<_Toast.Close asChild>
							<TlButton type="normal" className="tlui-toast__close" style={{ marginLeft: 'auto' }}>
								<TlButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TlButtonLabel>
							</TlButton>
						</_Toast.Close>
					</div>
				)}
			</div>
			{!hasActions && (
				<_Toast.Close asChild>
					<TlButton type="normal" className="tlui-toast__close">
						<TlButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TlButtonLabel>
					</TlButton>
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
