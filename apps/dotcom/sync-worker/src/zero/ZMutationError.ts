import { ZErrorCode } from '@tldraw/dotcom-shared'

export class ZMutationError extends Error {
	public originalCause?: unknown

	constructor(
		public errorCode: ZErrorCode,
		message: string,
		originalCause?: unknown
	) {
		super(message)
		this.originalCause = originalCause
	}
}
