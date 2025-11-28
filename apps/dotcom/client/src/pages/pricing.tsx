import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { setInSessionStorage, useDialogs } from 'tldraw'
import { TlaSignInDialog } from '../tla/components/dialogs/TlaSignInDialog'
import { useFairyAccess } from '../tla/hooks/useFairyAccess'
import { useFairyFlags } from '../tla/hooks/useFairyFlags'
import { usePaddle } from '../tla/hooks/usePaddle'
import { useTldrawUser } from '../tla/hooks/useUser'
import '../tla/styles/fairy.css'
import { F } from '../tla/utils/i18n'
import styles from './pricing.module.css'

const FairySprite = lazy(() =>
	import('../fairy/fairy-sprite/FairySprite').then((m) => ({ default: m.FairySprite }))
)

export function Component() {
	const user = useTldrawUser()
	const hasFairyAccess = useFairyAccess()
	const { addDialog } = useDialogs()
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const [isProcessing, setIsProcessing] = useState(false)
	const { paddleLoaded, openPaddleCheckout } = usePaddle()
	const { flags } = useFairyFlags()

	// Handle checkout intent from search params (after sign-in redirect)
	useEffect(() => {
		if (searchParams.get('checkout') === 'true' && user && paddleLoaded) {
			// Clear the param
			setSearchParams((params) => {
				params.delete('checkout')
				return params
			})

			// Don't open checkout if purchase is disabled
			if (!flags.fairies_purchase_enabled) {
				return
			}

			// Don't open checkout if user already has fairy access
			if (hasFairyAccess) {
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
		flags.fairies_purchase_enabled,
	])

	const handlePurchaseClick = useCallback(() => {
		if (isProcessing) return

		// Don't allow purchase if purchase flag is disabled
		if (!flags.fairies_purchase_enabled) {
			return
		}

		// If user already has fairy access, go home
		if (user && hasFairyAccess) {
			navigate('/')
			return
		}

		if (!user) {
			// Store redirect path for after sign-in
			setInSessionStorage('redirect-to', '/pricing?checkout=true')
			addDialog({ component: TlaSignInDialog })
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
		flags.fairies_purchase_enabled,
	])

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<Link to="/" className={styles.homeButton}>
					<F defaultMessage="Home" />
				</Link>
				<div className={styles.logo} />

				<p className={styles.title}>
					<F defaultMessage="Fairies have come to tldraw for the month of December." />
				</p>

				<p className={styles.description}>
					<F defaultMessage="A fairy is a little guy that can work with you on the canvas. Fairies can work alone or as a team. There is no limit to what a fairy can do. Nobody knows where they came from." />
				</p>

				<p className={styles.temporaryNotice}>
					<F
						defaultMessage="Fairies are a <strong>temporary</strong> feature. On January 1st, 2026, all fairies will be removed from the application. Perhaps they will return again someday. Your purchase is for access to fairies for December 2025 only."
						values={{
							strong: (chunks) => <strong>{chunks}</strong>,
						}}
					/>
				</p>

				<div className={styles.pricingCard}>
					<div className={styles.pricingCardContent}>
						<div className={styles.pricingInfo}>
							<div className={styles.price}>$25</div>
							<div className={styles.priceDetails}>
								<div className={styles.priceDetail}>
									<F defaultMessage="three fairies" />
								</div>
								<div className={styles.priceDetail}>
									<F defaultMessage="one time payment" />
								</div>
							</div>
						</div>
						<div className={styles.fairyIcons}>
							<Suspense fallback={<div />}>
								<FairySprite pose="idle" hatColor="var(--tl-color-fairy-pink)" />
								<FairySprite pose="reading" hatColor="var(--tl-color-fairy-green)" />
								<FairySprite pose="thinking" hatColor="var(--tl-color-fairy-purple)" />
							</Suspense>
						</div>
					</div>
					<button
						className={styles.purchaseButton}
						onClick={handlePurchaseClick}
						disabled={isProcessing}
					>
						{!user ? (
							<F defaultMessage="Start your fairy adventure" />
						) : hasFairyAccess ? (
							<F defaultMessage="Your fairies are waiting for you! →" />
						) : (
							<F defaultMessage="Purchase Fairy Bundle" />
						)}
					</button>
				</div>

				<footer className={styles.footer}>
					<a href="/privacy.html" className={styles.footerLink}>
						<F defaultMessage="Privacy Policy" />
					</a>
					<a href="/tos.html" className={styles.footerLink}>
						<F defaultMessage="Terms of Service" />
					</a>
					<a href="https://tldraw.dev" className={styles.footerLink}>
						<F defaultMessage="Build with the tldraw SDK" />
					</a>
				</footer>
			</div>
		</div>
	)
}
