import { Toast as _Toast } from '@base-ui/react/toast'
import { useValue } from '@tldraw/editor'
import { memo, useEffect, useRef } from 'react'
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

type ManagedToast = ReturnType<typeof _Toast.useToastManager>['toasts'][number]

/** @internal */
function TldrawUiToast({ toast, managedToast }: { toast: TLUiToast; managedToast: ManagedToast }) {
	const { removeToast } = useToasts()
	const msg = useTranslation()

	const hasActions = toast.actions && toast.actions.length > 0

	const icon = toast.icon || (toast.severity && SEVERITY_TO_ICON[toast.severity])
	const iconLabel = toast.iconLabel || (toast.severity ? msg(`toast.${toast.severity}`) : '')

	return (
		<_Toast.Root
			toast={managedToast}
			className="tlui-toast__container"
			swipeDirection="right"
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
							<_Toast.Action
								key={i}
								render={<TldrawUiButton type={action.type} />}
								onClick={() => {
									action.onClick()
									// closing after the action ran matches the previous behavior
									removeToast(toast.id)
								}}
							>
								<TldrawUiButtonLabel>{action.label}</TldrawUiButtonLabel>
							</_Toast.Action>
						))}
						<_Toast.Close
							render={
								<TldrawUiButton
									type="normal"
									className="tlui-toast__close"
									style={{ marginLeft: 'auto' }}
								/>
							}
						>
							<TldrawUiButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TldrawUiButtonLabel>
						</_Toast.Close>
					</div>
				)}
			</div>
			{!hasActions && (
				<_Toast.Close render={<TldrawUiButton type="normal" className="tlui-toast__close" />}>
					<TldrawUiButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TldrawUiButtonLabel>
				</_Toast.Close>
			)}
		</_Toast.Root>
	)
}

/** @public @react */
export const DefaultToasts = memo(function TldrawUiToasts() {
	const { toasts, removeToast } = useToasts()
	const toastsArray = useValue('toasts', () => toasts.get(), [])
	const toastManager = _Toast.useToastManager()

	// Mirror tldraw's toast list into the Base UI toast manager, which owns timers,
	// swiping, and dismissal. Every add/update/close changes the manager state and
	// re-runs this effect, so only sync toasts that actually changed — unconditional
	// updates would loop forever.
	const syncedToastsRef = useRef(new Map<string, TLUiToast>())
	useEffect(() => {
		const syncedToasts = syncedToastsRef.current
		for (const toast of toastsArray) {
			if (syncedToasts.get(toast.id) === toast) continue
			const options = {
				data: toast,
				timeout: toast.keepOpen ? 0 : DEFAULT_TOAST_DURATION,
				onClose: () => removeToast(toast.id),
			}
			const isNew = !syncedToasts.has(toast.id)
			syncedToasts.set(toast.id, toast)
			if (isNew) {
				toastManager.add({ id: toast.id, ...options })
			} else {
				toastManager.update(toast.id, options)
			}
		}
		for (const managed of toastManager.toasts) {
			if (!toastsArray.some((t) => t.id === managed.id)) {
				toastManager.close(managed.id)
			}
		}
		for (const id of [...syncedToasts.keys()]) {
			if (!toastsArray.some((t) => t.id === id)) {
				syncedToasts.delete(id)
			}
		}
	}, [toastsArray, toastManager, removeToast])

	return (
		<_Toast.Viewport className="tlui-toast__viewport">
			{toastManager.toasts.map((managedToast) => (
				<TldrawUiToast
					key={managedToast.id}
					toast={managedToast.data as TLUiToast}
					managedToast={managedToast}
				/>
			))}
		</_Toast.Viewport>
	)
})
