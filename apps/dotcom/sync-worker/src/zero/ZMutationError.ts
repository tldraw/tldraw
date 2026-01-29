import { ZErrorCode } from '@tldraw/dotcom-shared'

export class ZMutationError extends Error {
	public cause?: unknown

	constructor(
		public errorCode: ZErrorCode,
		message: string,
		cause?: unknown
	) {
		super(message)
		this.cause = cause
	}
}
