import { lazy, Suspense } from 'react'
import { F } from '../tla/utils/i18n'
import styles from './pricing.module.css'

const FairySprite = lazy(() =>
	import('../fairy/fairy-sprite/FairySprite').then((m) => ({ default: m.FairySprite }))
)

interface PricingContentProps {
	user: any
	hasFairyAccess: boolean
	isProcessing: boolean
	onPurchaseClick(): void
	showFooter?: boolean
}

export function PricingContent({
	hasFairyAccess,
	isProcessing,
	onPurchaseClick,
	showFooter = true,
}: PricingContentProps) {
	return (
		<div className={styles.pricingContentWrapper}>
			<div className={styles.logo} />

			<div>
				<p className={styles.title}>
					<F
						defaultMessage="<strong>Fairies</strong> have come to tldraw for the month of December."
						values={{
							strong: (chunks) => <strong>{chunks}</strong>,
						}}
					/>
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
			</div>

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
				<button className={styles.purchaseButton} onClick={onPurchaseClick} disabled={isProcessing}>
					{hasFairyAccess ? (
						<F defaultMessage="Your fairies are waiting" />
					) : (
						<F defaultMessage="Purchase Fairy Bundle" />
					)}
				</button>
			</div>

			{showFooter && (
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
			)}
		</div>
	)
}
