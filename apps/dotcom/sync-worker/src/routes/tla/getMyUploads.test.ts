import { StatusError } from 'itty-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeKysely } from '../../test/fakeKysely'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ requireAuth: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { requireAuth } = await import('../../utils/tla/getAuth')
const { getMyUploads, MAX_LISTED_UPLOADS } = await import('./getMyUploads')

const ME = 'user_aaaa11112222bbbb'
const env = {} as Environment

function mockPool(resultSets: unknown[][]) {
	const fake = createFakeKysely(resultSets)
	vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)
	return fake
}

const request = () => new Request('https://sync.tldraw.xyz/app/my-uploads') as any

beforeEach(() => {
	vi.mocked(requireAuth).mockResolvedValue({ userId: ME } as any)
})

afterEach(() => vi.clearAllMocks())

describe('getMyUploads', () => {
	it('refuses a caller who is not signed in, before reading anything', async () => {
		vi.mocked(requireAuth).mockRejectedValue(new StatusError(401, 'Unauthorized'))
		const fake = mockPool([])
		await expect(getMyUploads(request(), env)).rejects.toMatchObject({ status: 401 })
		expect(fake.queries).toEqual([])
	})

	it('lists the uploads the rows hold, newest first, with their times as numbers', async () => {
		const fake = mockPool([
			[
				{ objectName: 'b-photo-png', fileId: 'file_1', uploadedAt: '1700000000000' },
				{ objectName: 'a-cat-jpg', fileId: 'file_2', uploadedAt: 1690000000000 },
			],
		])
		const response = await getMyUploads(request(), env)
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			uploads: [
				{ objectName: 'b-photo-png', fileId: 'file_1', uploadedAt: 1700000000000 },
				{ objectName: 'a-cat-jpg', fileId: 'file_2', uploadedAt: 1690000000000 },
			],
		})
		expect(fake.destroy).toHaveBeenCalled()
	})

	// The asset row's userId is the uploader; the file's owner or workspace doesn't matter. Uploads
	// someone else made in the caller's files, the server's copies (no userId) and the thumbnails of
	// board library items aren't listed.
	it("lists only the caller's own uploads, in files that aren't deleted", async () => {
		const fake = mockPool([[]])
		await getMyUploads(request(), env)
		const [query] = fake.queries
		expect(query.sql).toBe(
			'select "asset"."objectName", "asset"."fileId", (extract(epoch from "asset"."uploadedAt") * 1000)::float8 as "uploadedAt" ' +
				'from "asset" inner join "file" on "file"."id" = "asset"."fileId" ' +
				'where "asset"."userId" = $1 and "asset"."isLibraryThumbnail" = $2 and "file"."isDeleted" = $3 ' +
				'and "asset"."objectName" ~* $4 order by "asset"."uploadedAt" desc limit $5'
		)
		expect(query.parameters).toEqual([
			ME,
			false,
			false,
			'-(png|jpe?g|gif|webp|avif|svg)$',
			MAX_LISTED_UPLOADS,
		])
	})
})
