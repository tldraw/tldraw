import { useRaw } from '../hooks/useRaw'

export function Component() {
	const raw = useRaw()
	return <div>{raw('Settings')}</div>
}
