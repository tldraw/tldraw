import { Suspense } from 'react'
import {
	TldrawUiButton,
	TldrawUiDialogBody,
	TldrawUiDialogCloseButton,
	TldrawUiDialogFooter,
	TldrawUiDialogHeader,
	TldrawUiDialogTitle,
} from 'tldraw'
import { F } from '../../tla/utils/i18n'

export function FairyAnnouncementDialog({ onClose }: { onClose(): void }) {
	return (
		<>
			<Suspense>{/* <CleanFairySpriteComponent /> */}</Suspense>
			<TldrawUiDialogHeader>
				<TldrawUiDialogTitle>
					<F defaultMessage="Fairies" />
				</TldrawUiDialogTitle>
				<TldrawUiDialogCloseButton />
			</TldrawUiDialogHeader>
			<TldrawUiDialogBody style={{ maxWidth: 300 }}>
				<F
					defaultMessage="A flutter of <b>fairies</b> have come to tldraw for the month of December. To investigate further, find the fairy and click it."
					values={{
						b: (chunks) => <b>{chunks}</b>,
					}}
				/>
			</TldrawUiDialogBody>
			<TldrawUiDialogFooter className="tlui-dialog__footer__actions">
				<TldrawUiButton type="primary" onClick={onClose}>
					<F defaultMessage="I understand" />
				</TldrawUiButton>
			</TldrawUiDialogFooter>
		</>
	)
}
