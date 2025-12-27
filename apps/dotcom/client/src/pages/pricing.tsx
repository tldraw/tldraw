import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../tla/components/dialogs/TlaSignInDialog'
import { useFairyAccess } from '../tla/hooks/useFairyAccess'
import { useFeatureFlags } from '../tla/hooks/useFeatureFlags'
import { usePaddle } from '../tla/hooks/usePaddle'
import { useTldrawUser } from '../tla/hooks/useUser'
import '../tla/styles/fairy.css'
import { F } from '../tla/utils/i18n'
import { setRedirect } from '../tla/utils/redirect'
import { PricingContent } from './PricingContent'
import styles from './pricing.module.css'

export function Component() {
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
		if (!isLoaded) return // Wait for flags to load
		if (searchParams.get('checkout') === 'true' && user && paddleLoaded) {
			// Clear the param
			setSearchParams((params) => {
				params.delete('checkout')
				return params
			})

			// Don't open checkout if disabled or user already has access
			if (!flags.fairies.enabled || !flags.fairies_purchase.enabled || hasFairyAccess) {
				return
			}

			// Open checkout
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
		if (!isLoaded) return // Wait for flags to load

		// Don't allow purchase if fairies feature is disabled
		if (!flags.fairies.enabled) {
			return
		}

		// If user already has fairy access, go home (check before purchase flag)
		if (user && hasFairyAccess) {
			navigate('/')
			return
		}

		// Don't allow purchase if purchase flag is disabled
		if (!flags.fairies_purchase.enabled) {
			return
		}

		if (!user) {
			// Store redirect path for after sign-in
			setRedirect('/pricing?checkout=true')
			addDialog({
				component: (props) => <TlaSignInDialog {...props} skipRedirect />,
			})
			return
		}

		// User is signed in, open Paddle directly
		if (!paddleLoaded) {
			return
		}

		setIsProcessing(true)
		const success = openPaddleCheckout(user.id, user.clerkUser.primaryEmailAddress?.emailAddress)
		if (!success) {
			setIsProcessing(false)
		}
		// Keep processing state until checkout completes or user closes overlay
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
	])

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<Link to="/" className={styles.homeButton}>
					<F defaultMessage="Home" />
				</Link>
				<PricingContent
					user={user}
					hasFairyAccess={hasFairyAccess}
					isProcessing={isProcessing}
					onPurchaseClick={handlePurchaseClick}
				/>
			</div>
		</div>
	)
}
