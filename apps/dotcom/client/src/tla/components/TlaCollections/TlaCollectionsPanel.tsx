import {
	AddToCollectionMenuItem,
	CollectionsPanel,
	CollectionsPanelButton,
} from '@tldraw/collections'
import { useMaybeApp } from '../../hooks/useAppState'
import styles from '../TlaEditor/top.module.css'

export function TlaCollectionsPanel() {
	const source = useMaybeApp()?.collections
	if (!source) return null
	return <CollectionsPanel source={source} />
}

export function TlaCollectionsPanelButton() {
	const source = useMaybeApp()?.collections
	if (!source) return null
	return (
		<div className={styles.collectionsPanelButton}>
			<CollectionsPanelButton />
		</div>
	)
}

export function TlaAddToCollectionMenuItem() {
	const source = useMaybeApp()?.collections
	if (!source) return null
	return <AddToCollectionMenuItem source={source} />
}
