import { useAuth } from '@clerk/clerk-react'
import { addBreadcrumb, withScope } from '@sentry/react'
import { SubmitFeedbackRequestBody } from '@tldraw/dotcom-shared'
import {
	TlButton,
	TlButtonCheck,
	TlButtonLabel,
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
} from '@tldraw/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
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
			<TlDialogHeader>
				<TlDialogTitle>
					<F defaultMessage="Send feedback" />
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody className={styles.dialogBody}>
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
			</TlDialogBody>
			<TlDialogFooter />
		</div>
	)
}

function SignedInSubmitFeedbackDialog({ onClose }: { onClose(): void }) {
	const rInput = useRef<HTMLTextAreaElement>(null)
	const [includeFileLink, setIncludeFileLink] = useState(true)
	const toasts = useToasts()
	const intl = useIntl()
	const onSubmit = useCallback(async () => {
		if (!rInput.current?.value?.trim()) return
		fetch('/api/app/submit-feedback', {
			method: 'POST',
			body: JSON.stringify({
				allowContact: true,
				description: rInput.current.value.trim(),
				url: includeFileLink
					? window.location.href.replace('https', 'https-please-be-mindful')
					: '',
			} satisfies SubmitFeedbackRequestBody),
		})
			.then((r) => {
				if (!r.ok) {
					throw new Error('Failed to submit feedback ' + r.status)
				}
			})
			.catch((e) => {
				addBreadcrumb({ message: 'Failed to submit feedback' })
				withScope((scope) => {
					console.error(e)
					scope.setExtra('description', rInput.current?.value?.trim())
				})
			})
		deleteFromLocalStorage(descriptionKey)
		onClose()
		toasts.addToast({
			severity: 'success',
			title: intl.formatMessage(messages.submitted),
			description: intl.formatMessage(messages.thanks),
		})
	}, [includeFileLink, intl, onClose, toasts])

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
			<TlDialogHeader>
				<TlDialogTitle>
					<F defaultMessage="Send feedback" />
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody className={styles.dialogBody}>
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
			</TlDialogBody>
			<TlDialogFooter className="tlui-dialog__footer__actions">
				<div className="tlui-dialog__footer__file-link-checkbox">
					<TlButton
						type="normal"
						onClick={() => setIncludeFileLink((v) => !v)}
						className={styles.feedbackDialogCheckbox}
					>
						<TlButtonCheck checked={includeFileLink} />
						<TlButtonLabel>
							<F defaultMessage="Include link to current file" />
						</TlButtonLabel>
					</TlButton>
				</div>
				<TlButton type="normal" onClick={onClose}>
					<TlButtonLabel>
						<F defaultMessage="Cancel" />
					</TlButtonLabel>
				</TlButton>
				<TlButton type="primary" onClick={onSubmit}>
					<TlButtonLabel>
						<F defaultMessage="Submit" />
					</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
		</>
	)
}
