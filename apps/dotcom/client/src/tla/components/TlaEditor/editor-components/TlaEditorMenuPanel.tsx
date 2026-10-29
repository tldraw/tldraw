import { useMaybeApp } from '../../../hooks/useAppState'
import { TlaCollectionsPanelButton } from '../../TlaCollections/TlaCollectionsPanel'
import { TlaEditorTopLeftPanel } from '../TlaEditorTopLeftPanel'
import styles from '../top.module.css'

export function TlaEditorMenuPanel() {
	const app = useMaybeApp()
	return (
		<div className={styles.menuPanelRow}>
			<TlaEditorTopLeftPanel isAnonUser={!app} />
			<TlaCollectionsPanelButton />
		</div>
	)
}
