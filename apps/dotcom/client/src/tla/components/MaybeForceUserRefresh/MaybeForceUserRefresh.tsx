import { ReactNode, useState } from 'react'
import { useValue } from 'tldraw'
import { isClientTooOld$ } from '../../hooks/useAppState'
import { F } from '../../utils/i18n'
import { TlaButton } from '../TlaButton/TlaButton'
import styles from './MaybeForceUserRefresh.module.css'

export function MaybeForceUserRefresh({ children }: { children: ReactNode }) {
	const isClientTooOld = useValue(isClientTooOld$)
	const [forceDismiss, setForceDismiss] = useState(false)

	const showModal = isClientTooOld && !forceDismiss

	return (
		<div className={styles.container}>
			<div
				className={styles.container}
				style={{
					pointerEvents: showModal ? 'none' : 'all',
					opacity: showModal ? 0.5 : 1,
				}}
			>
				{children}
			</div>
			{showModal ? (
				<div className={styles.modal}>
					<div className={styles.modalContent}>
						<div className={styles.modalTitle}>
							<F defaultMessage="Please reload the page" />
						</div>
						<div>
							<F defaultMessage="This version of tldraw is no longer supported." />
						</div>
						<div className={styles.modalActions}>
							<TlaButton
								className={styles.modalButton}
								variant="secondary"
								onClick={() => {
									setForceDismiss(true)
								}}
							>
								<F defaultMessage="Later" />
							</TlaButton>
							<TlaButton
								className={styles.modalButton}
								onClick={() => {
									window.location.reload()
								}}
							>
								<F defaultMessage="Reload" />
							</TlaButton>
						</div>
					</div>
				</div>
			) : null}
		</div>
	)
}
