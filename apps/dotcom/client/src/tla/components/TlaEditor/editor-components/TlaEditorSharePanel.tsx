import { useParams } from 'react-router-dom'
import { useMaybeApp } from '../../../hooks/useAppState'
import { TlaEditorTopRightPanel } from '../TlaEditorTopRightPanel'

export function TlaEditorSharePanel() {
	const app = useMaybeApp()
	const fileSlug = useParams<{ fileSlug: string }>().fileSlug
	return <TlaEditorTopRightPanel isAnonUser={!app} context={fileSlug ? 'file' : 'scratch'} />
}
