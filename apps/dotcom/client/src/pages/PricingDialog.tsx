import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
	setInSessionStorage,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useDialogs,
} from 'tldraw'
import { TlaSignInDialog } from '../tla/components/dialogs/TlaSignInDialog'
import { useFairyAccess } from '../tla/hooks/useFairyAccess'
import { useFeatureFlags } from '../tla/hooks/useFeatureFlags'
import { usePaddle } from '../tla/hooks/usePaddle'
import { useTldrawUser } from '../tla/hooks/useUser'
import { PricingContent } from './PricingContent'
import styles from './pricing.module.css'

export function PricingDialog({ onClose }: { onClose(): void }) {
	const user = useTldrawUser()
	const hasFairyAccess = useFairyAccess()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const [isProcessing, setIsProcessing] = useState(false)
	const { paddleLoaded, openPaddleCheckout } = usePaddle()
	const { flags, isLoaded } = useFeatureFlags()

	// Handle checkout intent from search params (after sign-in redirect)
	useEffect(() => {
		if (!isLoaded) return
		if (searchParams.get('checkout') === 'true' && user && paddleLoaded) {
			setSearchParams((params) => {
				params.delete('checkout')
				return params
			})

			if (!flags.fairies.enabled || !flags.fairies_purchase.enabled || hasFairyAccess) {
				return
			}

			setTimeout(() => {
				openPaddleCheckout(user.id, user.clerkUser.primaryEmailAddress?.emailAddress)
			}, 100)
		}
	}, [
		searchParams,
		user,
		paddleLoaded,
		hasFairyAccess,
		openPaddleCheckout,
		setSearchParams,
		navigate,
		flags.fairies.enabled,
		flags.fairies_purchase.enabled,
		isLoaded,
	])

	const handlePurchaseClick = useCallback(() => {
		if (isProcessing) return
		if (!isLoaded) return

		if (!flags.fairies.enabled) {
			return
		}

		if (user && hasFairyAccess) {
			onClose()
			navigate('/')
			return
		}

		if (!flags.fairies_purchase.enabled) {
			return
		}

		if (!user) {
			onClose()
			setInSessionStorage('redirect-to', '/pricing?checkout=true')
			addDialog({ component: TlaSignInDialog })
			return
		}

		if (!paddleLoaded) {
			return
		}

		setIsProcessing(true)
		const success = openPaddleCheckout(user.id, user.clerkUser.primaryEmailAddress?.emailAddress)
		if (!success) {
			setIsProcessing(false)
		} else {
			onClose()
		}
		setTimeout(() => setIsProcessing(false), 1000)
	}, [
		user,
		hasFairyAccess,
		paddleLoaded,
		isProcessing,
		addDialog,
		navigate,
		openPaddleCheckout,
		flags.fairies.enabled,
		flags.fairies_purchase.enabled,
		isLoaded,
		onClose,
	])

	return (
		<>
			<TldrawUiDialogHeader className={styles.dialogHeader}>
				<TldrawUiDialogTitle>
					<span />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<PricingContent
					user={user}
					hasFairyAccess={hasFairyAccess}
					isProcessing={isProcessing}
					onPurchaseClick={handlePurchaseClick}
					showFooter={true}
				/>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className={styles.dialogFooter} />
		</>
	)
}
