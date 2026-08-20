import { useMaybeApp } from '../../../hooks/useAppState'
import { TlaEditorTopLeftPanel } from '../TlaEditorTopLeftPanel'

export function TlaEditorMenuPanel() {
	const app = useMaybeApp()
	return <TlaEditorTopLeftPanel isAnonUser={!app} />
}
