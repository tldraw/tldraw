import { useMaybeApp } from '../../../hooks/useAppState'
import { TlaEditorTopRightPanel } from '../TlaEditorTopRightPanel'

export function TlaEditorLegacySharePanel() {
	const app = useMaybeApp()
	return <TlaEditorTopRightPanel isAnonUser={!app} context="legacy" />
}
