import { isClerkAPIResponseError } from '@clerk/backend/errors'
import { IndexKey } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { LOAD_ID_HEADER, parseLoadId } from '../../utils/loadId'
import { isRateLimited } from '../../utils/rateLimit'
import { getClerkClient } from '../../utils/tla/getAuth'

type EnsureUserResult =
	| { outcome: 'existing' | 'created'; email: string }
	| { outcome: 'rate_limited' | 'no_clerk_user' | 'no_email' }
type EnsureUserOutcome = EnsureUserResult['outcome']
type InitOutcome = EnsureUserOutcome | 'error'

const OUTCOME_RESPONSES: Record<EnsureUserOutcome, { body: string; status: number }> = {
	existing: { body: 'ok', status: 200 },
	created: { body: 'ok', status: 200 },
	rate_limited: { body: 'Rate limited', status: 429 },
	no_clerk_user: { body: 'Clerk user not found', status: 404 },
	no_email: { body: 'Clerk user has no email address', status: 400 },
}

export async function initUser(req: IRequest, env: Environment): Promise<Response> {
	const start = Date.now()
	const loadId = parseLoadId(req.headers.get(LOAD_ID_HEADER))
	// Timed into Analytics Engine (joinable on the load id). Every response built here also carries
	// it as a Server-Timing header for the client's first_load report; a thrown error bubbles to
	// the shared handler and loses the header, which is fine since the report is not the place to
	// learn about a 500.
	const record = (outcome: InitOutcome) => {
		const ms = Date.now() - start
		writeDataPoint(undefined, env.MEASURE, env, 'init_user', {
			blobs: [outcome, ...(loadId ? [loadId] : [])],
			doubles: [ms],
		})
		return ms
	}
	const respond = (body: string, status: number, outcome: InitOutcome) => {
		const ms = record(outcome)
		return new Response(body, {
			status,
			headers: { 'Server-Timing': `init;dur=${ms};desc=${outcome}` },
		})
	}
	const id = req.params.userId
	const db = createPostgresConnectionPool(env, '/app/init')
	try {
		const { outcome } = await ensureUser(env, db, id)
		return respond(OUTCOME_RESPONSES[outcome].body, OUTCOME_RESPONSES[outcome].status, outcome)
	} catch (e) {
		record('error')
		throw e
	} finally {
		await db.destroy()
	}
}

// Ensures the user row + home workspace exist, and returns the account's email when they do.
// Idempotent: concurrent first-sign-ins race safely because all three inserts no-op on conflict, so the loser of the
// race falls through to the same outcome as the winner instead of hitting a unique violation.
export async function ensureUser(
	env: Environment,
	db: ReturnType<typeof createPostgresConnectionPool>,
	id: string
): Promise<EnsureUserResult> {
	const existing = await db
		.selectFrom('user')
		.where('id', '=', id)
		.select('email')
		.executeTakeFirst()
	if (existing) return { outcome: 'existing', email: existing.email }

	// Only the creation path is rate-limited: existing users take the cheap SELECT above on every
	// call and shouldn't burn rate-limit budget or be turned away by it.
	if (await isRateLimited(env, id)) {
		return { outcome: 'rate_limited' }
	}

	// Callers authenticate first, but a user deleted in Clerk since their token was issued would
	// otherwise throw here and 500 instead of being refused.
	const clerkUser = await getClerkClient(env)
		.users.getUser(id)
		.catch((e) => {
			if (isClerkAPIResponseError(e) && e.status === 404) return null
			throw e
		})
	if (!clerkUser) return { outcome: 'no_clerk_user' }

	// A Clerk user can lack an email (e.g. some SSO/social flows); reading [0].emailAddress on
	// such a user throws, which would fail that account on every call. Report it as an outcome.
	const email =
		clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress
	if (!email) return { outcome: 'no_email' }

	await db.transaction().execute(async (tx) => {
		const now = Date.now()
		await tx
			.insertInto('user')
			.values({
				id,
				name: clerkUser.fullName ?? '',
				email,
				avatar: clerkUser.imageUrl,
				color: '___INIT___',
				exportFormat: 'png',
				exportTheme: 'light',
				exportBackground: true,
				exportPadding: true,
				createdAt: now,
				updatedAt: now,
				// No feature flags on new users; the column is retained for future flags.
				flags: '',
			})
			.onConflict((oc) => oc.doNothing())
			.execute()
		await tx
			.insertInto('group')
			.values({
				id,
				// The home/private workspace defaults to "My workspace" and is renameable.
				name: 'My workspace',
				createdAt: now,
				updatedAt: now,
				isDeleted: false,
				inviteSecret: null,
			})
			.onConflict((oc) => oc.doNothing())
			.execute()
		await tx
			.insertInto('group_user')
			.values({
				userId: id,
				groupId: id,
				createdAt: now,
				updatedAt: now,
				role: 'owner',
				index: 'a1' as IndexKey,
				userName: clerkUser.fullName ?? '',
				userColor: '',
			})
			.onConflict((oc) => oc.doNothing())
			.execute()
	})
	// Clerk's email even if a concurrent request won the insert: it wrote the same Clerk user's.
	return { outcome: 'created', email }
}
