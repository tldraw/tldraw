import { useValue } from 'tldraw'
import { useFairyApp } from '../fairy-app/FairyAppProvider'
import { FungalNetwork } from './FungalNetwork'

export function FungalNetworks() {
	const fairyApp = useFairyApp()
	const networks = useValue('networks', () => fairyApp?.fungalNetworks.getNetworks() ?? [], [
		fairyApp,
	])

	if (!networks.length) return null

	return (
		<>
			{networks.map((network) => (
				<FungalNetwork key={network.id} network={network} />
			))}
		</>
	)
}
