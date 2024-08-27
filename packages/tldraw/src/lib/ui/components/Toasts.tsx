import * as T from '@radix-ui/react-toast'
import { useEditor } from '@tldraw/editor'
import * as React from 'react'
import { AlertSeverity, TLUiToast, useToasts } from '../context/toasts'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../icon-types'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'
import { TldrawUiButtonLabel } from './primitives/Button/TldrawUiButtonLabel'
import { TldrawUiIcon } from './primitives/TldrawUiIcon'

const SEVERITY_TO_ICON: { [msg in AlertSeverity]: TLUiIconType } = {
	success: 'check-circle',
	warning: 'warning-triangle',
	error: 'cross-circle',
	info: 'info-circle',
}

function Toast({ toast }: { toast: TLUiToast }) {
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
			duration={toast.keepOpen ? Infinity : 5000}
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

function _Toasts() {
	const { toasts } = useToasts()

	return toasts.map((toast) => <Toast key={toast.id} toast={toast} />)
}

export const Toasts = React.memo(_Toasts)

export function ToastViewport() {
	const editor = useEditor()
	const { toasts } = useToasts()

	const [hasToasts, setHasToasts] = React.useState(false)

	React.useEffect(() => {
		let timeoutId = -1
		if (toasts.length) {
			setHasToasts(true)
		} else {
			timeoutId = editor.timers.setTimeout(() => {
				setHasToasts(false)
			}, 1000)
		}

		return () => {
			clearTimeout(timeoutId)
		}
	}, [toasts.length, setHasToasts, editor])

	if (!hasToasts) return null

	return <T.ToastViewport className="tlui-toast__viewport" />
}
