import * as Dialogs from '@radix-ui/react-dialog'
import { useCallback } from 'react'
import { dialogsAtom, TldrawAppDialog } from '../../providers/TlaDialogsProvider'
import styles from './dialog.module.css'

export function TlaDialog({ dialog }: { dialog: TldrawAppDialog }) {
	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				dialogsAtom.update((dialogs) => dialogs.filter((d) => d.id !== dialog.id))
				dialog.onClose?.()
			}
		},
		[dialog]
	)

	return (
		<Dialogs.Root onOpenChange={handleOpenChange} modal open>
			<Dialogs.Overlay className={styles.overlay} />
			<Dialogs.Content
				className={styles.container}
				onPointerDownOutside={() => {
					handleOpenChange(false)
				}}
			>
				<div className={styles.containerInner}>
					<dialog.Component />
				</div>
			</Dialogs.Content>
		</Dialogs.Root>
	)
}
