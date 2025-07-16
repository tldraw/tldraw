import { TldrawAiTransformFn } from './TldrawAiTransform'
import { TLAiPrompt, TLAiStreamingChange } from './types'
import { TldrawAiApplyFn, TldrawAiGenerateFn, TldrawAiStreamFn } from './useTldrawAi'

export class TldrawAi<Prompt, Change> {
	static use<TransformedPrompt, TransformedChange>(
		transform: TldrawAiTransformFn<
			TLAiPrompt,
			TransformedPrompt,
			TLAiStreamingChange,
			TransformedChange
		>
	) {
		return new TldrawAi<TransformedPrompt, TransformedChange>(
			[transform],
			undefined,
			undefined,
			undefined
		)
	}

	static useWithGenerate(generate: TldrawAiGenerateFn<TLAiPrompt, TLAiStreamingChange>) {
		return new TldrawAi<TLAiPrompt, TLAiStreamingChange>([], generate, undefined, undefined)
	}

	static useWithStream(stream: TldrawAiStreamFn<TLAiPrompt, TLAiStreamingChange>) {
		return new TldrawAi<TLAiPrompt, TLAiStreamingChange>([], undefined, stream, undefined)
	}

	static useWithApply(apply: TldrawAiApplyFn) {
		return new TldrawAi<TLAiPrompt, TLAiStreamingChange>([], undefined, undefined, apply)
	}

	static empty = new TldrawAi<TLAiPrompt, TLAiStreamingChange>([], undefined, undefined, undefined)

	/** @internal */
	public readonly transforms: readonly TldrawAiTransformFn<any, any, any, any>[]
	/** @internal */
	public readonly generateMethod: TldrawAiGenerateFn<Prompt, Change> | undefined
	/** @internal */
	public readonly streamMethod: TldrawAiStreamFn<Prompt, Change> | undefined
	/** @internal */
	public readonly applyMethod: TldrawAiApplyFn | undefined

	private constructor(
		transforms: readonly TldrawAiTransformFn<any, any, any, any>[],
		generateMethod: TldrawAiGenerateFn<Prompt, Change> | undefined,
		streamMethod: TldrawAiStreamFn<Prompt, Change> | undefined,
		applyMethod: TldrawAiApplyFn | undefined
	) {
		this.transforms = transforms
		this.generateMethod = generateMethod
		this.streamMethod = streamMethod
		this.applyMethod = applyMethod
	}

	use<NewPrompt, NewChange>(transform: TldrawAiTransformFn<Prompt, NewPrompt, Change, NewChange>) {
		if (this.generateMethod || this.streamMethod || this.applyMethod) {
			throw new Error('TldrawAi.use must be called before withGenerate, useStream, or useApply')
		}
		return new TldrawAi<NewPrompt, NewChange>(
			[...this.transforms, transform],
			this.generateMethod,
			this.streamMethod,
			this.applyMethod
		)
	}

	withGenerate(generate: TldrawAiGenerateFn<Prompt, Change>) {
		if (this.generateMethod) {
			throw new Error('generate method already set')
		}
		return new TldrawAi<Prompt, Change>(
			this.transforms,
			generate,
			this.streamMethod,
			this.applyMethod
		)
	}

	withStream(stream: TldrawAiStreamFn<Prompt, Change>) {
		if (this.streamMethod) {
			throw new Error('stream method already set')
		}
		return new TldrawAi<Prompt, Change>(
			this.transforms,
			this.generateMethod,
			stream,
			this.applyMethod
		)
	}

	withApply(apply: TldrawAiApplyFn) {
		if (this.applyMethod) {
			throw new Error('apply method already set')
		}
		return new TldrawAi<Prompt, Change>(
			this.transforms,
			this.generateMethod,
			this.streamMethod,
			apply
		)
	}
}
