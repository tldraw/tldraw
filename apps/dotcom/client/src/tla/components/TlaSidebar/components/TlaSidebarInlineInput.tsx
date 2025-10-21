import classNames from 'classnames'
import { useCallback, useRef } from 'react'
import { TldrawUiInput } from 'tldraw'
import styles from '../sidebar.module.css'
import { pinIcon } from './pinIcon'

export interface TlaSidebarInlineInputProps {
	defaultValue?: string
	placeholder?: string
	onComplete(value: string): void
	onCancel(): void
	isPinned?: boolean
	className?: string
	wrapperClassName?: string
	autoFocus?: boolean
	'data-testid'?: string
}

export function TlaSidebarInlineInput({
	defaultValue = '',
	placeholder,
	onComplete,
	onCancel,
	isPinned,
	className,
	wrapperClassName,
	autoFocus = true,
	'data-testid': dataTestId,
}: TlaSidebarInlineInputProps) {
	const ref = useRef<HTMLInputElement>(null)
	const wasSaved = useRef(false)

	const handleSave = useCallback(() => {
		if (wasSaved.current) return
		const elm = ref.current
		if (!elm) return
		const value = elm.value.slice(0, 200).trim()

		if (value) {
			wasSaved.current = true
			onComplete(value)
		} else {
			onCancel()
		}
	}, [onComplete, onCancel])

	const handleCancel = useCallback(() => {
		wasSaved.current = true
		onCancel()
	}, [onCancel])

	return (
		<div className={classNames(styles.sidebarFileListItemRenameInputWrapper, wrapperClassName)}>
			{isPinned && pinIcon}
			<TldrawUiInput
				ref={ref}
				data-testid={dataTestId}
				className={classNames(
					styles.sidebarFileListItemRenameInput,
					'tla-text_ui__regular',
					className
				)}
				defaultValue={defaultValue}
				placeholder={placeholder}
				onComplete={handleSave}
				onCancel={handleCancel}
				onBlur={handleSave}
				autoSelect
				autoFocus={autoFocus}
			/>
		</div>
	)
}
