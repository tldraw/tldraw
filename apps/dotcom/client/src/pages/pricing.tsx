import styles from './pricing.module.css'

export function Component() {
	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<div className={styles.logo} />

				<h1 className={styles.title}>Fairies have come to tldraw for the month of December.</h1>

				<p className={styles.description}>
					A fairy is a little guy that can work with you on the canvas. Fairies can work alone or as
					a team. There is no limit to what a fairy can do. Nobody knows where they came from.
				</p>

				<p className={styles.temporaryNotice}>
					Fairies are a <strong>temporary</strong> feature. On January 1st, 2026, all fairies will
					be removed from the application. Perhaps they will return again someday. Your purchase is
					for access to fairies for December 2025 only.
				</p>

				<div className={styles.pricingCard}>
					<div className={styles.pricingInfo}>
						<div className={styles.price}>$25</div>
						<div className={styles.priceDetails}>
							<div className={styles.priceDetail}>three fairies</div>
							<div className={styles.priceDetail}>one time payment</div>
						</div>
					</div>
					<div className={styles.fairyIcons}>
						<img src="/fairy/fairy-placeholder-1.svg" alt="Fairy" className={styles.fairyIcon} />
						<img src="/fairy/fairy-placeholder-2.svg" alt="Fairy" className={styles.fairyIcon} />
						<img src="/fairy/fairy-placeholder-1.svg" alt="Fairy" className={styles.fairyIcon} />
					</div>
				</div>

				<button className={styles.purchaseButton}>Purchase Fairy Bundle</button>

				<footer className={styles.footer}>
					<a href="/privacy-policy" className={styles.footerLink}>
						Privacy Policy
					</a>
					<a href="/terms-of-service" className={styles.footerLink}>
						Terms of Service
					</a>
					<a href="https://tldraw.dev" className={styles.footerLink}>
						Build with the tldraw SDK
					</a>
				</footer>
			</div>
		</div>
	)
}
