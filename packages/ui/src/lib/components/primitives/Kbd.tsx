import { kbd } from './shared'

/** @public */
export interface KbdProps {
	children: string
}

/** @public */
export function Kbd({ children }: KbdProps) {
	return (
		<kbd className="tlui-kbd">
			{kbd(children).map((k, i) => (
				<span key={i}>{k}</span>
			))}
		</kbd>
	)
}
