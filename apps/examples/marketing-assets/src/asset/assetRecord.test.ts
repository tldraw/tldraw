import { createShapeId, Editor, TLShapeId } from 'tldraw'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeEditor } from '../test/makeEditor'
import {
	getCurrentVersion,
	markFailed,
	markGenerating,
	pushVersion,
	recoverIfStale,
	refreshHeartbeat,
	revertTo,
	setVerdict,
} from './assetRecord'
import { AssetVersion, MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'
import { MarketingAssetShapeUtil } from './AssetShapeUtil'

let editor: Editor
let id: TLShapeId

beforeEach(() => {
	editor = makeEditor([MarketingAssetShapeUtil])
	id = createShapeId()
	editor.createShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: {
			w: 100,
			h: 100,
			outputTypeId: 'ig-square',
			prompt: 'a brief',
			versions: [],
			currentVersion: 0,
			status: 'generating',
			error: '',
			generatingStartedAt: 1000,
			verdict: 'none',
		},
	})
})

const shape = () => editor.getShape<MarketingAssetShape>(id)!
const version = (n: number): AssetVersion => ({
	assetId: `asset-${n}`,
	textLayers: [],
	caption: `caption ${n}`,
	instruction: `instruction ${n}`,
	createdAt: n,
})

describe('pushVersion', () => {
	it('appends a version, shows it, and clears the generating state', () => {
		pushVersion(editor, id, version(1))

		expect(shape().props.versions).toHaveLength(1)
		expect(shape().props.currentVersion).toBe(0)
		expect(shape().props.status).toBe('idle')
		expect(shape().props.generatingStartedAt).toBe(0)
	})

	it('is append-only and always points current at the newest', () => {
		pushVersion(editor, id, version(1))
		pushVersion(editor, id, version(2))
		pushVersion(editor, id, version(3))

		expect(shape().props.versions.map((v) => v.assetId)).toEqual(['asset-1', 'asset-2', 'asset-3'])
		expect(shape().props.currentVersion).toBe(2)
		expect(getCurrentVersion(shape())?.assetId).toBe('asset-3')
	})
})

describe('revertTo', () => {
	beforeEach(() => {
		pushVersion(editor, id, version(1))
		pushVersion(editor, id, version(2))
		pushVersion(editor, id, version(3))
	})

	it('moves the current pointer without dropping versions', () => {
		revertTo(editor, id, 0)

		expect(shape().props.currentVersion).toBe(0)
		expect(shape().props.versions).toHaveLength(3)
		expect(getCurrentVersion(shape())?.assetId).toBe('asset-1')
	})

	it('ignores out-of-bounds indices', () => {
		revertTo(editor, id, 9)
		expect(shape().props.currentVersion).toBe(2)
		revertTo(editor, id, -1)
		expect(shape().props.currentVersion).toBe(2)
	})
})

describe('status transitions', () => {
	it('markGenerating enters generating and stamps the heartbeat', () => {
		pushVersion(editor, id, version(1)) // -> idle
		markGenerating(editor, id, 5000)

		expect(shape().props.status).toBe('generating')
		expect(shape().props.error).toBe('')
		expect(shape().props.generatingStartedAt).toBe(5000)
	})

	it('markFailed enters error with a message and clears the heartbeat', () => {
		markFailed(editor, id, new Error('boom'))

		expect(shape().props.status).toBe('error')
		expect(shape().props.error).toBe('boom')
		expect(shape().props.generatingStartedAt).toBe(0)
	})
})

describe('refreshHeartbeat', () => {
	it('updates the timestamp while generating', () => {
		refreshHeartbeat(editor, id, 9999)
		expect(shape().props.generatingStartedAt).toBe(9999)
	})

	it('is a no-op once the asset is no longer generating', () => {
		pushVersion(editor, id, version(1)) // -> idle, generatingStartedAt 0
		refreshHeartbeat(editor, id, 9999)
		expect(shape().props.generatingStartedAt).toBe(0)
	})
})

describe('recoverIfStale', () => {
	it('returns a stale render with versions back to idle', () => {
		pushVersion(editor, id, version(1)) // -> idle
		markGenerating(editor, id, 1000) // generating since t=1000
		recoverIfStale(editor, shape(), 1000 + 50_000, 45_000)

		expect(shape().props.status).toBe('idle')
		expect(shape().props.generatingStartedAt).toBe(0)
	})

	it('errors a stale render that never produced a version', () => {
		// fresh shape: generating since 1000, no versions
		recoverIfStale(editor, shape(), 1000 + 50_000, 45_000)

		expect(shape().props.status).toBe('error')
		expect(shape().props.error).toBe('Generation was interrupted')
	})

	it('spares a render whose heartbeat is still fresh', () => {
		recoverIfStale(editor, shape(), 1000 + 10_000, 45_000)
		expect(shape().props.status).toBe('generating')
	})
})

describe('setVerdict', () => {
	it('sets and clears the verdict', () => {
		setVerdict(editor, id, 'liked')
		expect(shape().props.verdict).toBe('liked')
		setVerdict(editor, id, 'none')
		expect(shape().props.verdict).toBe('none')
	})
})
