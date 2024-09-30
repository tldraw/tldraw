import * as T from '@radix-ui/react-toast'
import { useValue } from '@tldraw/editor'
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

	return (
		<T.Root
			onOpenChange={onOpenChange}
			className="tlui-toast__container"
			duration={toast.keepOpen ? Infinity : DEFAULT_TOAST_DURATION}
			data-severity={toast.severity}
		>
			{icon && (
				<div className="tlui-toast__icon">
					<TldrawUiIcon icon={icon} />
				</div>
			)}
			<div className="tlui-toast__main">
				<div className="tlui-toast__content">
					{toast.title && <T.Title className="tlui-toast__title">{toast.title}</T.Title>}
					{toast.description && (
						<T.Description className="tlui-toast__description">{toast.description}</T.Description>
					)}
				</div>
				{toast.actions && (
					<div className="tlui-toast__actions">
						{toast.actions.map((action, i) => (
							<T.Action key={i} altText={action.label} asChild onClick={action.onClick}>
								<TldrawUiButton type={action.type}>
									<TldrawUiButtonLabel>{action.label}</TldrawUiButtonLabel>
								</TldrawUiButton>
							</T.Action>
						))}
						<T.Close asChild>
							<TldrawUiButton
								type="normal"
								className="tlui-toast__close"
								style={{ marginLeft: 'auto' }}
							>
								<TldrawUiButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TldrawUiButtonLabel>
							</TldrawUiButton>
						</T.Close>
					</div>
				)}
			</div>
			{!hasActions && (
				<T.Close asChild>
					<TldrawUiButton type="normal" className="tlui-toast__close">
						<TldrawUiButtonLabel>{toast.closeLabel ?? msg('toast.close')}</TldrawUiButtonLabel>
					</TldrawUiButton>
				</T.Close>
			)}
		</T.Root>
	)
}

/** @public @react */
export const TldrawUiToasts = memo(function TldrawUiToasts() {
	const { toasts } = useToasts()
	const toastsArray = useValue('toasts', () => toasts.get(), [])
	return (
		<>
			{toastsArray.map((toast) => (
				<TldrawUiToast key={toast.id} toast={toast} />
			))}
			<T.ToastViewport className="tlui-toast__viewport" />
		</>
	)
})
