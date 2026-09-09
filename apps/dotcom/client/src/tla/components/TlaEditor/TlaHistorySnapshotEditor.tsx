import { useMemo } from 'react'
import { TLComponents, TLStoreSnapshot } from 'tldraw'
import { F } from '../../utils/i18n'
import { TlaCtaButton } from '../TlaCtaButton/TlaCtaButton'
import { TlaEditorErrorFallback } from './editor-components/TlaEditorErrorFallback'
import { TlaLegacySnapshotEditor } from './TlaLegacySnapshotEditor'

export function TlaHistorySnapshotEditor({
	fileSlug,
	snapshot,
	onRestore,
}: {
	fileSlug: string
	snapshot: TLStoreSnapshot
	onRestore(): Promise<void>
}) {
	const components = useMemo((): TLComponents => {
		return {
			ErrorFallback: TlaEditorErrorFallback,
			SharePanel: () => (
				<TlaCtaButton
					canvas
					style={{
						pointerEvents: 'all',
						margin: 6,
					}}
					onClick={() => {
						const sure = window.confirm('Are you sure?')
						if (!sure) return
						onRestore()
							.then(() => {
								window.alert('done')
							})
							.catch((error) => {
								window.alert('Something went wrong!')
								console.error(error)
							})
					}}
				>
					<F defaultMessage="Restore version"></F>
				</TlaCtaButton>
			),
		}
	}, [onRestore])

	return <TlaLegacySnapshotEditor fileSlug={fileSlug} snapshot={snapshot} components={components} />
}
