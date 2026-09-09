import { useAuth } from '@clerk/clerk-react'
import { addBreadcrumb, captureException } from '@sentry/react'
import { SubmitFeedbackRequestBody } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonCheck,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	deleteFromLocalStorage,
	fetch,
	getFromLocalStorage,
	setInLocalStorage,
	useToasts,
} from 'tldraw'
import { F, defineMessages, useIntl } from '../../utils/i18n'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import styles from './dialogs.module.css'

const messages = defineMessages({
	submitted: { defaultMessage: 'Feedback submitted' },
	thanks: { defaultMessage: 'Thanks for helping us improve tldraw!' },
	failed: { defaultMessage: 'Could not submit feedback' },
	tryAgain: { defaultMessage: 'Please try again.' },
})

const descriptionKey = 'tldraw-feedback-description'

export function SubmitFeedbackDialog({ onClose }: { onClose(): void }) {
	const isSignedIn = useAuth().isSignedIn
	if (isSignedIn) {
		return <SignedInSubmitFeedbackDialog onClose={onClose} />
	}
	return <SignedOutSubmitFeedbackDialog />
}

function SignedOutSubmitFeedbackDialog() {
	return (
		<div className={styles.dialogContainer}>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Send feedback" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<p>
					<F defaultMessage="Have a bug, issue, or idea for tldraw? Let us know!" />
				</p>
				<ul>
					<li>
						<ExternalLink
							eventName="menu-feedback-discord-link-clicked"
							to="https://discord.tldraw.com/?utm_source=dotcom&utm_medium=organic&utm_campaign=dotcom-feedback"
						>
							<F defaultMessage="Chat with us on Discord" />
						</ExternalLink>
					</li>
					<li>
						<ExternalLink
							eventName="menu-feedback-github-link-clicked"
							to="https://github.com/tldraw/tldraw/issues"
						>
							<F defaultMessage="Submit an issue on GitHub" />
						</ExternalLink>
					</li>
				</ul>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter />
		</div>
	)
}

function SignedInSubmitFeedbackDialog({ onClose }: { onClose(): void }) {
	const rInput = useRef<HTMLTextAreaElement>(null)
	const [includeFileLink, setIncludeFileLink] = useState(true)
	const toasts = useToasts()
	const intl = useIntl()
	const [isSubmitting, setIsSubmitting] = useState(false)
	const onSubmit = useCallback(async () => {
		const description = rInput.current?.value?.trim()
		if (!description || isSubmitting) return
		setIsSubmitting(true)
		try {
			const r = await fetch('/api/app/submit-feedback', {
				method: 'POST',
				body: JSON.stringify({
					allowContact: true,
					description,
					url: includeFileLink
						? window.location.href.replace('https', 'https-please-be-mindful')
						: '',
				} satisfies SubmitFeedbackRequestBody),
			})
			if (!r.ok) {
				throw new Error('Failed to submit feedback ' + r.status)
			}
		} catch (e) {
			// Keep the dialog (and the saved draft) so the text isn't lost on a failed send.
			// Don't attach the draft to the report: it's unsent user text and shouldn't reach Sentry.
			addBreadcrumb({ message: 'Failed to submit feedback' })
			captureException(e)
			toasts.addToast({
				severity: 'error',
				title: intl.formatMessage(messages.failed),
				description: intl.formatMessage(messages.tryAgain),
			})
			setIsSubmitting(false)
			return
		}
		deleteFromLocalStorage(descriptionKey)
		onClose()
		toasts.addToast({
			severity: 'success',
			title: intl.formatMessage(messages.submitted),
			description: intl.formatMessage(messages.thanks),
		})
	}, [includeFileLink, intl, isSubmitting, onClose, toasts])

	// Focus the input when the dialog opens, select all text
	useEffect(() => {
		const input = rInput.current
		if (input) {
			input.focus()
			input.select()
		}
	}, [])

	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Send feedback" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.dialogBody}>
				<p>
					<F
						defaultMessage="Have a bug, issue, or idea for tldraw? Let us know! Fill out this form and we will follow up over email if needed. You can also <discord>chat with us on Discord</discord> or <github>submit an issue on GitHub</github>."
						values={{
							discord: (chunks) => {
								return (
									<ExternalLink
										eventName="menu-feedback-discord-link-clicked"
										to="https://discord.tldraw.com/?utm_source=dotcom&utm_medium=organic&utm_campaign=dotcom-feedback"
									>
										{chunks}
									</ExternalLink>
								)
							},
							github: (chunks) => {
								return (
									<ExternalLink
										eventName="menu-feedback-github-link-clicked"
										to="https://github.com/tldraw/tldraw/issues"
									>
										{chunks}
									</ExternalLink>
								)
							},
						}}
					/>
				</p>
				<textarea
					placeholder="Please provide as much detail as possible."
					defaultValue={getFromLocalStorage(descriptionKey) ?? undefined}
					onInput={(e) => {
						setInLocalStorage(descriptionKey, e.currentTarget.value)
					}}
					className={styles.feedbackDialogTextArea}
					ref={rInput}
				/>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<div className="tlui-dialog__footer__file-link-checkbox">
					<TldrawUiButton
						type="normal"
						onClick={() => setIncludeFileLink((v) => !v)}
						className={styles.feedbackDialogCheckbox}
					>
						<TldrawUiButtonCheck checked={includeFileLink} />
						<TldrawUiButtonLabel>
							<F defaultMessage="Include link to current file" />
						</TldrawUiButtonLabel>
					</TldrawUiButton>
				</div>
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Cancel" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
				<TldrawUiButton type="primary" onClick={onSubmit} disabled={isSubmitting}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Submit" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
