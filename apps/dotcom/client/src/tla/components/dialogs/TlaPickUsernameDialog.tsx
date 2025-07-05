import { useCallback, useRef, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	TldrawUiInput,
} from 'tldraw'
import { F } from '../../utils/i18n'
import styles from './dialogs.module.css'

export interface TlaPickUsernameDialogProps {
	suggestedUsername: string
	onUsernameSelected: (username: string) => void
	onCancel: () => void
}

export function TlaPickUsernameDialog({
	suggestedUsername,
	onUsernameSelected,
	onCancel,
}: TlaPickUsernameDialogProps) {
	const [isLoading, setIsLoading] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const handleSubmit = useCallback(
		async (username?: string) => {
			const value = username ?? inputRef.current?.value ?? ''
			const trimmedValue = value.trim()

			if (!trimmedValue || isLoading) return

			setIsLoading(true)
			try {
				await onUsernameSelected(trimmedValue)
			} finally {
				setIsLoading(false)
			}
		},
		[onUsernameSelected, isLoading]
	)

	return (
		<div className={styles.dialogContainer}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Pick your username" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<div className={styles.usernamePickerForm}>
					<p>
						<F defaultMessage="Welcome to tldraw! How would you like to be called?" />
					</p>
					<div className={styles.usernameInputContainer}>
						<label className={styles.usernameInputLabel}>
							<F defaultMessage="Your name" />
						</label>
						<TldrawUiInput
							ref={inputRef}
							data-testid="username-input"
							defaultValue={suggestedUsername}
							onComplete={handleSubmit}
							onCancel={onCancel}
							autoFocus
							autoSelect
						/>
					</div>
					<p className={styles.usernameHelpText}>
						<F defaultMessage="You can change this later in your settings." />
					</p>
				</div>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className={styles.dialogFooter}>
				<TldrawUiButton type="normal" onClick={onCancel} disabled={isLoading}>
					<F defaultMessage="Skip" />
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={() => handleSubmit()} disabled={isLoading}>
					{isLoading ? <F defaultMessage="Saving..." /> : <F defaultMessage="Save" />}
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</div>
	)
}
