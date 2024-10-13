import styles from './spacer.module.css'

export function TlaSpacer({
	height = 'full',
	width = 'full',
}: {
	height?: number | string
	width?: number | string
}) {
	return <div className={styles.spacer} data-h={height} data-w={width} />
}
