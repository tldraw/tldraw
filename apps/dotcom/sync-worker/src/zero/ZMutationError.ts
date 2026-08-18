import { ZErrorCode } from '@tldraw/dotcom-shared'

export class ZMutationError extends Error {
	constructor(
		public errorCode: ZErrorCode,
		message: string,
		public originalCause?: unknown
	) {
		super(message)
	}
}
