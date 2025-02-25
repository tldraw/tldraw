import { useAuth } from '@clerk/clerk-react'
import { addBreadcrumb, withScope } from '@sentry/react'
import { SubmitFeedbackRequestBody } from '@tldraw/dotcom-shared'
import { useCallback, useRef } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
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
import { TlaFormCheckbox } from '../tla-form/tla-form'

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
	return <SignedOutSubmitFeedbackDialog onClose={onClose} />
}

function SignedOutSubmitFeedbackDialog({ onClose }: { onClose(): void }) {
	return (
		<div>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle style={{ fontWeight: 700 }}>
					<F defaultMessage="Give us feedback" />
				</TldrawUiDialogTitle>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				style={{ maxWidth: 350, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 0 }}
			>
				<p>
					<F defaultMessage="See something wrong? Got an idea to improve tldraw? We’d love to hear it!" />
				</p>
				<ul style={{ gap: 4 }}>
					<li>
						<ExternalLink to="https://discord.tldraw.com/?utm_source=dotcom&utm_medium=organic&utm_campaign=dotcom-feedback">
							<F defaultMessage="Chat with us on Discord" />
						</ExternalLink>
					</li>
					<li>
						<ExternalLink to="https://github.com/tldraw/tldraw/issues">
							<F defaultMessage="Submit an issue on GitHub" />
						</ExternalLink>
					</li>
				</ul>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="normal" onClick={onClose}>
					<TldrawUiButtonLabel>
						<F defaultMessage="Close" />
					</TldrawUiButtonLabel>
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</div>
	)
}

function SignedInSubmitFeedbackDialog({ onClose }: { onClose(): void }) {
	const input = useRef<HTMLTextAreaElement>(null)
	const checkBox = useRef<HTMLInputElement>(null)
	const toasts = useToasts()
	const intl = useIntl()
	const onSubmit = useCallback(async () => {
		if (!input.current?.value?.trim()) return
		if (!checkBox.current) return
		fetch('/api/app/submit-feedback', {
			method: 'POST',
			body: JSON.stringify({
				allowContact: checkBox.current.checked,
				description: input.current.value.trim(),
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
					scope.setExtra('description', input.current?.value?.trim())
				})
			})
		deleteFromLocalStorage(descriptionKey)
		onClose()
		toasts.addToast({
			severity: 'success',
			title: intl.formatMessage(messages.submitted),
			description: intl.formatMessage(messages.thanks),
		})
	}, [intl, onClose, toasts])
	return (
		<div>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle style={{ fontWeight: 700 }}>
					<F defaultMessage="Give us feedback" />
				</TldrawUiDialogTitle>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				style={{ maxWidth: 350, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 0 }}
			>
				<p>
					<F defaultMessage="See something wrong? Got an idea to improve tldraw? We’d love to hear it!" />
				</p>
				<p>
					<F
						defaultMessage="Fill out this form, <discord>chat with us on Discord</discord> or <github>submit an issue on GitHub</github>."
						values={{
							discord: (chunks) => {
								return (
									<ExternalLink to="https://discord.tldraw.com/?utm_source=dotcom&utm_medium=organic&utm_campaign=dotcom-feedback">
										{chunks}
									</ExternalLink>
								)
							},
							github: (chunks) => {
								return (
									<ExternalLink to="https://github.com/tldraw/tldraw/issues">{chunks}</ExternalLink>
								)
							},
						}}
					/>
				</p>
				<textarea
					placeholder="Please provide as much detail as possible"
					defaultValue={getFromLocalStorage(descriptionKey) ?? undefined}
					onInput={(e) => {
						setInLocalStorage(descriptionKey, e.currentTarget.value)
					}}
					style={{
						border: '1px solid var(--tla-color-border)',
						borderRadius: '6px',
						minHeight: '100px',
						padding: '6px 8px',
						resize: 'vertical',
					}}
					ref={input}
				/>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						flex: 1,
					}}
				>
					<div style={{ display: 'flex', flex: 1, padding: '0px 12px' }}>
						<TlaFormCheckbox ref={checkBox} defaultChecked={false}>
							<F defaultMessage="Allow tldraw to email me about this" />
						</TlaFormCheckbox>
					</div>
					<div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end' }}>
						<TldrawUiButton type="normal" onClick={onClose}>
							<TldrawUiButtonLabel>
								<F defaultMessage="Cancel" />
							</TldrawUiButtonLabel>
						</TldrawUiButton>
						<TldrawUiButton type="primary" onClick={onSubmit}>
							<TldrawUiButtonLabel>
								<F defaultMessage="Submit" />
							</TldrawUiButtonLabel>
						</TldrawUiButton>
					</div>
				</div>
			</TldrawUiDialogFooter>
		</div>
	)
}
