import classNames from 'classnames'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { TlButton, TlButtonIcon, TlButtonLabel, TlButtonSpinner, TlButtonType } from './TlButton'

/** @public */
export interface TlCopyButtonProps {
	onCopy?(): void | Promise<void>
	value?: string
	type?: TlButtonType
	children: ReactNode
	className?: string
}

/** @public @react */
export function TlCopyButton({
	children,
	type = 'primary',
	onCopy,
	value,
	className,
}: TlCopyButtonProps) {
	const [copied, setCopied] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const isMountedRef = useRef(true)

	useEffect(() => {
		return () => {
			isMountedRef.current = false
			if (resetTimeoutRef.current !== null) {
				clearTimeout(resetTimeoutRef.current)
			}
		}
	}, [])

	const handleClick = useCallback(async () => {
		if (copied || isLoading) return

		setIsLoading(true)
		try {
			if (onCopy) {
				await onCopy()
			} else if (value !== undefined) {
				await navigator.clipboard.writeText(value)
			}

			if (!isMountedRef.current) return

			setCopied(true)
			if (resetTimeoutRef.current !== null) {
				clearTimeout(resetTimeoutRef.current)
			}
			resetTimeoutRef.current = setTimeout(() => {
				if (!isMountedRef.current) return
				setCopied(false)
				resetTimeoutRef.current = null
			}, 1000)
		} finally {
			if (isMountedRef.current) {
				setIsLoading(false)
			}
		}
	}, [copied, isLoading, onCopy, value])

	return (
		<TlButton
			type={type}
			className={classNames('tl-copy-button', className)}
			onClick={handleClick}
			disabled={isLoading}
			data-state={isLoading ? 'loading' : 'ready'}
		>
			<TlButtonLabel>{children}</TlButtonLabel>
			{isLoading ? <TlButtonSpinner /> : <TlButtonIcon icon={copied ? 'check' : 'copy'} />}
		</TlButton>
	)
}
