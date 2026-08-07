import {
	CopyObjectCommand,
	DeleteObjectsCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	S3Client,
} from '@aws-sdk/client-s3'
import { makeEnv } from '../lib/makeEnv'

// One-off cleanup of the THUMBNAILS bucket after #9667. Two unrelated pieces of history to settle,
// both of which leave objects that nothing will ever read, overwrite or sweep — the bucket has no
// expiration rule, by design, because the current thumbnail has to outlive any lifecycle window.
//
// 1. **The OG key changed shape.** `getOgImageCacheKey` used to address an image by board *and*
//    output size:
//
//      og/{kind}/{slug}/1200x630/light.png     (old)
//      og/{kind}/{slug}/light.png              (new)
//
//    Dropping the size segment is the right shape — a key segment that can change re-addresses every
//    board's image at once — but the change itself is that event, and it shipped without a migration.
//    Every image rendered before the deploy is still at its old address, so the OG route finds nothing
//    and serves the generic tldraw card. Shared files heal on their own, since a persist re-renders
//    them; published boards do not, because their only triggers are a republish and the crawler
//    repair path. Those stay generic until this runs.
//
// 2. **MCP screenshots used to live here.** Before #9667 the MCP tool wrote `mcp/…` into THUMBNAILS;
//    it now writes to its own bucket, which carries an expiration rule precisely because that key
//    includes the board's content version and so strands an object on every edit. The ones written
//    before the move are still here, unreferenced and unexpiring — one per board, per version, per
//    theme, per page. Nothing reads them: the tool looks only in MCP_DATA_BUCKET.
//
// Dry run unless `--apply` is passed.

const env = makeEnv(['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY_SECRET'])

const R2_URL = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`

// Slugs never contain a slash (`parseSlug` in getOgImage.ts refuses one), so every segment is exact.
// The size segment is matched as any WxH rather than the current 1200x630, so an image written under
// a size we have since changed is migrated too instead of being quietly left behind.
const OLD_OG_KEY_RE =
	/^og\/(published|shared_file)\/([^/]+)\/(\d+x\d+)\/(light\.png|light\.pending)$/

// Everything under this prefix is pre-#9667 MCP output. The live path writes to a different bucket,
// so there is no current key shape here to accidentally match.
const MCP_PREFIX = 'mcp/'
const OG_PREFIX = 'og/'

const CONCURRENCY = 16
// R2 caps a multi-object delete at 1000 keys.
const DELETE_BATCH_SIZE = 1000

interface OldOgObject {
	oldKey: string
	newKey: string
	isImage: boolean
}

function parseOldOgKey(key: string): OldOgObject | null {
	const match = OLD_OG_KEY_RE.exec(key)
	if (!match) return null
	const [, kind, slug, , leaf] = match
	return { oldKey: key, newKey: `og/${kind}/${slug}/${leaf}`, isImage: leaf === 'light.png' }
}

async function listKeys(
	r2: S3Client,
	bucket: string,
	prefix: string,
	onKey: (key: string) => void
): Promise<number> {
	let continuationToken: string | undefined
	let scanned = 0
	do {
		const page = await r2.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				ContinuationToken: continuationToken,
			})
		)
		for (const object of page.Contents ?? []) {
			if (!object.Key) continue
			scanned++
			onKey(object.Key)
		}
		continuationToken = page.NextContinuationToken
		process.stdout.write(`  ${prefix} scanned ${scanned}\r`)
	} while (continuationToken)
	process.stdout.write(`  ${prefix} scanned ${scanned}\n`)
	return scanned
}

async function exists(r2: S3Client, bucket: string, key: string): Promise<boolean> {
	try {
		await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
		return true
	} catch (error: any) {
		if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false
		throw error
	}
}

type CopyOutcome = 'copied' | 'skipped_newer_exists'

/**
 * Copies one image to its new key.
 *
 * A board that has re-rendered since the deploy already has a *fresher* image at the new key, so the
 * old one must not overwrite it — this is a repair for the boards that missed out, not a restore of
 * everything to its pre-deploy state.
 */
async function copyToNewKey(
	r2: S3Client,
	bucket: string,
	object: OldOgObject,
	apply: boolean
): Promise<CopyOutcome> {
	if (await exists(r2, bucket, object.newKey)) return 'skipped_newer_exists'
	if (!apply) return 'copied'

	await r2.send(
		new CopyObjectCommand({
			Bucket: bucket,
			Key: object.newKey,
			CopySource: encodeURI(`${bucket}/${object.oldKey}`),
			// Carries `version` and `createdAt` across. `version` is what the OG route compares against
			// the board's current content to decide hit vs stale, so a copy that dropped it would serve
			// every migrated image as permanently stale.
			MetadataDirective: 'COPY',
		})
	)
	return 'copied'
}

async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const results = new Array<R>(items.length)
	let next = 0
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (next < items.length) {
				const index = next++
				results[index] = await fn(items[index])
			}
		})
	)
	return results
}

async function deleteKeys(r2: S3Client, bucket: string, keys: string[], apply: boolean) {
	if (!apply || keys.length === 0) return
	for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
		const batch = keys.slice(i, i + DELETE_BATCH_SIZE)
		const response = await r2.send(
			new DeleteObjectsCommand({
				Bucket: bucket,
				Delete: { Objects: batch.map((Key) => ({ Key })) },
			})
		)
		for (const error of response.Errors ?? []) {
			process.stderr.write(`  ! failed to delete ${error.Key}: ${error.Message}\n`)
		}
		process.stdout.write(`  deleted ${Math.min(i + batch.length, keys.length)}/${keys.length}\r`)
	}
	process.stdout.write(`  deleted ${keys.length}/${keys.length}\n`)
}

function parseArgs() {
	const args = process.argv.slice(2)
	const bucket = args.find((a) => a.startsWith('--bucket='))?.slice('--bucket='.length)
	if (!bucket) {
		throw new Error(
			'Usage: backfill-og-thumbnail-keys --bucket=<name> [--skip-mcp] [--apply]\n' +
				'  Production bucket is `thumbnails`; staging/preview is `thumbnails-preview`.\n' +
				'  Without --apply this only reports what it would do.'
		)
	}
	return { bucket, apply: args.includes('--apply'), skipMcp: args.includes('--skip-mcp') }
}

async function main() {
	const { bucket, apply, skipMcp } = parseArgs()
	const r2 = new S3Client({
		region: 'auto',
		endpoint: R2_URL,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_ACCESS_KEY_SECRET,
		},
	})

	process.stdout.write(`${apply ? 'APPLYING' : 'DRY RUN'} against bucket "${bucket}"\n\n`)

	process.stdout.write('Listing...\n')
	const oldOg: OldOgObject[] = []
	await listKeys(r2, bucket, OG_PREFIX, (key) => {
		const parsed = parseOldOgKey(key)
		if (parsed) oldOg.push(parsed)
	})
	const mcpKeys: string[] = []
	if (!skipMcp) {
		await listKeys(r2, bucket, MCP_PREFIX, (key) => mcpKeys.push(key))
	}

	const images = oldOg.filter((o) => o.isImage)
	// Pending markers are single-flight state, not content, so they are deleted rather than migrated:
	// an expired one is meaningless, and a live one has already been re-created at the new key by
	// whichever job holds it.
	const markers = oldOg.filter((o) => !o.isImage)
	process.stdout.write(
		`\nFound ${images.length} old og images, ${markers.length} old pending markers, ` +
			`${mcpKeys.length} orphaned mcp objects.\n\n`
	)

	if (images.length === 0 && markers.length === 0 && mcpKeys.length === 0) {
		process.stdout.write('Nothing to do.\n')
		return
	}

	let copied = 0
	let skipped = 0
	if (images.length > 0) {
		process.stdout.write('Copying og images to their new keys...\n')
		let done = 0
		const outcomes = await mapWithConcurrency(images, CONCURRENCY, async (object) => {
			const outcome = await copyToNewKey(r2, bucket, object, apply)
			done++
			if (done % 100 === 0) process.stdout.write(`  ${done}/${images.length}\r`)
			return outcome
		})
		copied = outcomes.filter((o) => o === 'copied').length
		skipped = outcomes.filter((o) => o === 'skipped_newer_exists').length
		process.stdout.write(`  copied ${copied}, skipped ${skipped} (already re-rendered)\n\n`)
	}

	// Only delete sources whose copy is actually readable at the new key. A skipped one is safe to
	// delete too, since something newer is already there. Verified rather than assumed: the delete is
	// irreversible and the bucket is the only copy.
	let deletableImages: string[] = images.map((o) => o.oldKey)
	if (apply && images.length > 0) {
		process.stdout.write('Verifying new keys before deleting old ones...\n')
		const verified = await mapWithConcurrency(images, CONCURRENCY, async (object) =>
			(await exists(r2, bucket, object.newKey)) ? object.oldKey : null
		)
		deletableImages = verified.filter((key): key is string => key !== null)
		const unverified = images.length - deletableImages.length
		if (unverified > 0) {
			process.stderr.write(
				`  ! ${unverified} images have no object at their new key — keeping those\n`
			)
		}
		process.stdout.write(`  ${deletableImages.length} verified\n\n`)
	}

	const toDelete = [...deletableImages, ...markers.map((m) => m.oldKey), ...mcpKeys]
	process.stdout.write(`${apply ? 'Deleting' : 'Would delete'} ${toDelete.length} objects...\n`)
	await deleteKeys(r2, bucket, toDelete, apply)

	process.stdout.write(
		`\n${apply ? 'Done' : 'Dry run complete'}: ` +
			`${copied} images ${apply ? 'migrated' : 'to migrate'}, ${skipped} already current, ` +
			`${markers.length} markers and ${mcpKeys.length} mcp objects, ` +
			`${toDelete.length} objects ${apply ? 'deleted' : 'to delete'} in total.\n`
	)
	if (!apply) process.stdout.write('Re-run with --apply to make these changes.\n')
}

main().catch((error) => {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
	process.exit(1)
})
