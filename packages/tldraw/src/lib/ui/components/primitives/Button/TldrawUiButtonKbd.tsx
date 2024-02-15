import { Kbd } from '../Kbd'

/** @public */
export type TLUiButtonKbdProps = { kbd: string }

/** @public */
export function TldrawUiButtonKbd({ kbd }: TLUiButtonKbdProps) {
	return <Kbd>{kbd}</Kbd>
}
