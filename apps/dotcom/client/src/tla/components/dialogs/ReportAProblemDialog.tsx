import { captureException, withScope } from '@sentry/react'
import { ReportAProblemRequestBody } from '@tldraw/dotcom-shared'
import { useCallback, useRef } from 'react'
import {
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDialogBody,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
	fetch,
} from 'tldraw'
import { F } from '../../utils/i18n'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import { TlaFormCheckbox } from '../tla-form/tla-form'

export function ReportAProblemDialog({ onClose }: { onClose(): void }) {
	const input = useRef<HTMLTextAreaElement>(null)
	const checkBox = useRef<HTMLInputElement>(null)
	const onSubmit = useCallback(async () => {
		if (!input.current?.value?.trim()) return
		if (!checkBox.current) return
		fetch('/api/app/report-a-problem', {
			method: 'POST',
			body: JSON.stringify({
				allowContact: checkBox.current.checked,
				description: input.current.value.trim(),
			} satisfies ReportAProblemRequestBody),
		}).catch((e) =>
			withScope((scope) => {
				console.error(e)
				scope.setExtra('description', input.current?.value?.trim())
				captureException(new Error('Failed to report a problem'))
			})
		)
		onClose()
	}, [onClose])
	return (
		<div>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle style={{ fontWeight: 700 }}>
					<F defaultMessage="Report a problem" />
				</TldrawUiDialogTitle>
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody
				style={{ maxWidth: 350, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}
			>
				<p>
					<F defaultMessage="Please provide as much detail as possible in the textbox below." />
				</p>
				<p>
					<F
						defaultMessage="Alternatively, <discord>chat with us on Discord</discord> or <github>submit an issue on GitHub</github>"
						values={{
							discord: (chunks) => {
								return <ExternalLink to="https://discord.gg/rhsyWMUJxd">{chunks}</ExternalLink>
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
					style={{
						border: '1px solid var(--tla-color-border)',
						borderRadius: '6px',
						minHeight: '100px',
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
