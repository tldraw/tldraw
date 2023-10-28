import * as T from '@radix-ui/react-toast'
import * as React from 'react'
import { TLUiToast, useToasts } from '../hooks/useToastsProvider'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TLUiIconType } from '../icon-types'
import { Button } from './primitives/Button'
import { Icon } from './primitives/Icon'

function Toast({ toast }: { toast: TLUiToast }) {
	const { removeToast } = useToasts()
	const msg = useTranslation()

	const onOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			removeToast(toast.id)
		}
	}

	const hasActions = toast.actions && toast.actions.length > 0

	return (
		<T.Root
			onOpenChange={onOpenChange}
			className="tlui-toast__container"
			duration={toast.keepOpen ? Infinity : 5000}
		>
			{toast.icon && (
				<div className="tlui-toast__icon">
					<Icon icon={toast.icon as TLUiIconType} />
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
								<Button type={action.type}>{action.label}</Button>
							</T.Action>
						))}
						<T.Close asChild>
							<Button type="normal" className="tlui-toast__close" style={{ marginLeft: 'auto' }}>
								{toast.closeLabel ?? msg('toast.close')}
							</Button>
						</T.Close>
					</div>
				)}
			</div>
			{!hasActions && (
				<T.Close asChild>
					<Button type="normal" className="tlui-toast__close">
						{toast.closeLabel ?? msg('toast.close')}
					</Button>
				</T.Close>
			)}
		</T.Root>
	)
}

function _Toasts() {
	const { toasts } = useToasts()

	return (
		<>
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} />
			))}
		</>
	)
}

export const Toasts = React.memo(_Toasts)

export function ToastViewport() {
	const { toasts } = useToasts()

	const [hasToasts, setHasToasts] = React.useState(false)

	React.useEffect(() => {
		let cancelled = false
		if (toasts.length) {
			setHasToasts(true)
		} else {
			setTimeout(() => {
				if (!cancelled) {
					setHasToasts(false)
				}
			}, 1000)
		}

		return () => {
			cancelled = true
		}
	}, [toasts.length, setHasToasts])

	if (!hasToasts) return null

	return <T.ToastViewport className="tlui-toast__viewport" />
}
