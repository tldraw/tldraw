import { ReactNode, useCallback, useState } from 'react'
import { TlaButton } from '../TlaButton/TlaButton'

// A button that copies something to the clipboard
export function TlaShareMenuCopyButton({
	children,
	type = 'primary',
	onClick,
}: {
	children: ReactNode
	onClick(): void | Promise<void>
	type?: 'primary' | 'secondary' | 'warning'
}) {
	const [copied, setCopied] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const handleCopyLinkClick = useCallback(async () => {
		if (copied) return
		setIsLoading(true)
		await onClick()
		setCopied(true)
		setIsLoading(false)
		const timeout = setTimeout(() => setCopied(false), 1000)
		return () => {
			setCopied(false)
			clearTimeout(timeout)
		}
	}, [copied, onClick])

	return (
		<TlaButton
			variant={type}
			onClick={handleCopyLinkClick}
			iconRight={copied ? 'check' : 'copy'}
			isLoading={isLoading}
		>
			{children}
		</TlaButton>
	)
}
