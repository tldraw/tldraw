import { Editor } from '../Editor'

/**
 * A session is an interaction or other event that occurs over time,
 * such as resizing, drawing, or transforming shapes.
 *
 * @public
 */
export abstract class Session {
	constructor(public editor: Editor) {}

	abstract readonly id: string

	abstract start(): void

	abstract update(): void

	abstract complete(): void

	abstract cancel(): void

	abstract interrupt(): void
}
