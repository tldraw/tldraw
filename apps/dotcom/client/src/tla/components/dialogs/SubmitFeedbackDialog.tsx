import { useAuth } from '@clerk/clerk-react'
import { addBreadcrumb, captureException } from '@sentry/react'
import { SubmitFeedbackRequestBody } from '@tldraw/dotcom-shared'
import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import {
	defineMessages,
	deleteFromLocalStorage,
	F,
	fetch,
	getFromLocalStorage,
	setInLocalStorage,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	useToasts,
} from 'tldraw'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import { TlaButton } from '../TlaButton/TlaButton'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './dialogs.module.css'

const messages = defineMessages({
	submitted: { defaultMessage: 'Feedback submitted' },
	thanks: { defaultMessage: 'Thanks for helping us improve tldraw!' },
	failed: { defaultMessage: 'Could not submit feedback' },
	tryAgain: { defaultMessage: 'Please try again.' },
	descriptionPlaceholder: { defaultMessage: 'Please provide as much detail as possible.' },
})

const descriptionKey = 'tldraw-feedback-description'

function DiscordLink({ children }: { children: ReactNode }) {
	return (
		<ExternalLink
			eventName="menu-feedback-discord-link-clicked"
			to="https://discord.tldraw.com/?utm_source=dotcom&utm_medium=organic&utm_campaign=dotcom-feedback"
		>
			{children}
		</ExternalLink>
	)
}

function GithubIssuesLink({ children }: { children: ReactNode }) {
	return (
		<ExternalLink
			eventName="menu-feedback-github-link-clicked"
			to="https://github.com/tldraw/tldraw/issues"
		>
			{children}
		</ExternalLink>
	)
}

export function SubmitFeedbackDialog({ onClose }: { onClose(): void }) {
	const isSignedIn = useAuth().isSignedIn
	const anchorRef = useRef<HTMLDivElement>(null)
	useLayoutEffect(() => {
		const content = anchorRef.current?.closest('.tlui-dialog__content')
		if (!(content instanceof HTMLElement)) return
		content.classList.add(styles.feedbackDialog)
		content.style.alignSelf = 'start'
		content.style.marginTop = '8vh'
		content.style.maxHeight = '84vh'
		return () => content.classList.remove(styles.feedbackDialog)
	}, [])
	return (
		<>
			<div ref={anchorRef} hidden />
			{isSignedIn ? (
				<SignedInSubmitFeedbackDialog onClose={onClose} />
			) : (
				<SignedOutSubmitFeedbackDialog />
			)}
		</>
	)
}

function FeedbackCommunityLinks() {
	return (
		<div className={styles.feedbackCommunityLinks}>
			<DiscordLink>
				<TlaIcon icon="feedback" />
				<F defaultMessage="Chat with us on Discord" />
			</DiscordLink>
			<GithubIssuesLink>
				<TlaIcon icon="external" />
				<F defaultMessage="Submit an issue on GitHub" />
			</GithubIssuesLink>
		</div>
	)
}

function SignedOutSubmitFeedbackDialog() {
	return (
		<>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Send feedback" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody className={styles.feedbackBody}>
				<p>
					<F defaultMessage="Have a bug, issue, or idea for tldraw? Let us know!" />
				</p>
				<FeedbackCommunityLinks />
			</TldrawUiDialogBody>
		</>
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
			<TldrawUiDialogBody className={styles.feedbackBody}>
				<p>
					<F defaultMessage="Have a bug, issue, or idea for tldraw? Let us know! We’ll follow up over email if needed." />
				</p>
				<div className={styles.feedbackField}>
					<label htmlFor="feedback-description">
						<F defaultMessage="Your feedback" />
					</label>
					<textarea
						id="feedback-description"
						placeholder={intl.formatMessage(messages.descriptionPlaceholder)}
						defaultValue={getFromLocalStorage(descriptionKey) ?? undefined}
						onInput={(e) => {
							setInLocalStorage(descriptionKey, e.currentTarget.value)
						}}
						className={styles.feedbackDialogTextArea}
						ref={rInput}
					/>
				</div>
				<label className={styles.feedbackContextOption}>
					<input
						type="checkbox"
						checked={includeFileLink}
						onChange={(event) => setIncludeFileLink(event.currentTarget.checked)}
					/>
					<F defaultMessage="Include link to current file" />
				</label>
				<FeedbackCommunityLinks />
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter>
				<TlaButton variant="secondary" className={styles.feedbackCancel} onClick={onClose}>
					<F defaultMessage="Cancel" />
				</TlaButton>
				<TlaButton className={styles.feedbackSubmit} onClick={onSubmit} disabled={isSubmitting}>
					<F defaultMessage="Submit" />
				</TlaButton>
			</TldrawUiDialogFooter>
		</>
	)
}
