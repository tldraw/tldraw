import {
	TlButton,
	TlButtonLabel,
	TlDialogBody,
	TlDialogCloseButton,
	TlDialogFooter,
	TlDialogHeader,
	TlDialogTitle,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { F } from '../../utils/i18n'
import { ExternalLink } from '../ExternalLink/ExternalLink'

export function SlurpFailure({
	slurpPersistenceKey,
	onTryAgain,
	onClose,
}: {
	slurpPersistenceKey: string
	onTryAgain(): void
	onClose(): void
}) {
	return (
		<>
			<TlDialogHeader>
				<TlDialogTitle>
					<strong style={{ fontSize: 14 }}>
						<F defaultMessage="Upload failed" />
					</strong>
				</TlDialogTitle>
				<TlDialogCloseButton />
			</TlDialogHeader>
			<TlDialogBody
				style={{
					maxWidth: 350,
					display: 'flex',
					flexDirection: 'column',
					gap: 'var(--tl-space-4)',
				}}
			>
				<p>
					<F defaultMessage="We failed to upload some of the content you created before you signed in." />
				</p>
				<p>
					<F defaultMessage="Follow these steps to import the content manually:" />
				</p>
				<ol>
					<li>
						<ExternalLink to={routes.tlaLocalFile(slurpPersistenceKey)}>
							<F defaultMessage="Go here to see the content" />
						</ExternalLink>
					</li>
					<li>
						<F defaultMessage="Export the content as a .tldr file: Select 'Download' in the top left menu." />
					</li>
					<li>
						<F defaultMessage="Drag the file into the sidebar on this page. Or select the 'Import file' option from the user menu." />
					</li>
				</ol>
				<p>
					<F
						defaultMessage="Still having trouble? {GetHelpLink}"
						values={{
							GetHelpLink: (
								<ExternalLink to="https://discord.tldraw.com/?utm_source=dotcom&utm_medium=organic&utm_campaign=slurp-failure">
									<F defaultMessage="Get help on Discord" />
								</ExternalLink>
							),
						}}
					/>
				</p>
			</TlDialogBody>
			<TlDialogFooter className="tlui-dialog__footer__actions">
				<TlButton type="normal" onClick={() => onTryAgain()}>
					<TlButtonLabel>
						<F defaultMessage="Try Again" />
					</TlButtonLabel>
				</TlButton>
				<TlButton type="primary" onClick={() => onClose()}>
					<TlButtonLabel>
						<F defaultMessage="Close" />
					</TlButtonLabel>
				</TlButton>
			</TlDialogFooter>
		</>
	)
}
