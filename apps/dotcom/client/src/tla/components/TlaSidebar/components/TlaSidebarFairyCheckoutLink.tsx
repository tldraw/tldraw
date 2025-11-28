import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { useFairyLimit } from '../../../hooks/useFairyAccess'
import { usePaddle } from '../../../hooks/usePaddle'
import { F } from '../../../utils/i18n'
import styles from '../sidebar.module.css'

export function TlaSidebarFairyCheckoutLink() {
	const app = useApp()
	const { paddleLoaded, openPaddleCheckout } = usePaddle()

	// Show button only if user has no fairy access
	const currentFairyLimit = useFairyLimit()
	const user = useValue('user', () => app.getUser(), [app])
	const userEmail = user?.email

	// Early returns after all hooks
	if (currentFairyLimit === null || currentFairyLimit > 0) return null

	const handlePurchase = () => {
		const userId = app.userId
		if (!userId || !paddleLoaded) return

		openPaddleCheckout(userId, userEmail)
	}

	return (
		<div className={styles.sidebarDotDevLink}>
			<button
				data-testid="tla-sidebar-fairy-checkout"
				onClick={handlePurchase}
				className={styles.sidebarFairyCheckoutButton}
			>
				<span>
					<F defaultMessage="Purchase fairy access" />
				</span>
				<span className={styles.sidebarFairyCheckoutButtonPrice}>
					{/* eslint-disable-next-line */}
					{'$'}
				</span>
			</button>
		</div>
	)
}
