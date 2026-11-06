import { TLRelationCeiling } from './evaluate'

/**
 * What a capability token grants. The token is a subject (a link or an agent), optionally acting
 * for a user, limited by ceilings.
 *
 * @public
 */
export interface TLCapability {
	/** The token's own subject, for example `link:k1` or `agent:summarizer`. */
	readonly subject: string
	/** The user the token acts for. The session gets that user's subjects too. */
	readonly actingFor?: string | null
	/** Limits. Every ceiling must allow a check. */
	readonly ceilings?: readonly TLRelationCeiling[]
	/** Unix time in milliseconds after which the token is invalid. */
	readonly expiresAt?: number
}

/**
 * A narrower limit that anyone holding a token can add, without the secret.
 *
 * @public
 */
export interface TLCapabilityCaveat extends TLRelationCeiling {
	readonly expiresAt?: number
}

const PREFIX = 'tlcap1'
const encoder = new TextEncoder()

function b64url(bytes: Uint8Array): string {
	let s = ''
	for (const b of bytes) s += String.fromCharCode(b)
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
	const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
	const out = new Uint8Array(bin.length)
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
	return out
}

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
	const k = await crypto.subtle.importKey(
		'raw',
		key as BufferSource,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	return new Uint8Array(await crypto.subtle.sign('HMAC', k, encoder.encode(data)))
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
	if (a.length !== b.length) return false
	let diff = 0
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
	return diff === 0
}

/**
 * Sign a capability token. The format is macaroon-like: the signature is an HMAC chain over the
 * payload and each caveat, so a holder can add caveats with {@link attenuateCapabilityToken} but
 * cannot remove one.
 *
 * @public
 */
export async function createCapabilityToken(cap: TLCapability, secret: string): Promise<string> {
	const payload = b64url(encoder.encode(JSON.stringify(cap)))
	const sig = await hmac(encoder.encode(secret), payload)
	return `${PREFIX}.${payload}.${b64url(sig)}`
}

/**
 * Add a caveat to a token. Needs no secret. The result can do at most what the input could.
 *
 * @public
 */
export async function attenuateCapabilityToken(
	token: string,
	caveat: TLCapabilityCaveat
): Promise<string> {
	const parts = token.split('.')
	if (parts[0] !== PREFIX || parts.length < 3) throw new Error('not a capability token')
	const sig = fromB64url(parts[parts.length - 1])
	const encoded = b64url(encoder.encode(JSON.stringify(caveat)))
	const next = await hmac(sig, encoded)
	return [...parts.slice(0, -1), encoded, b64url(next)].join('.')
}

/**
 * Check a token's signature and expiry. Returns the capability with every caveat folded into its
 * ceilings, or `null` if the token is invalid or expired.
 *
 * @public
 */
export async function verifyCapabilityToken(
	token: string,
	secret: string,
	now = Date.now()
): Promise<TLCapability | null> {
	try {
		const parts = token.split('.')
		if (parts[0] !== PREFIX || parts.length < 3) return null
		const [, payload, ...rest] = parts
		const caveats = rest.slice(0, -1)
		let sig = await hmac(encoder.encode(secret), payload)
		for (const c of caveats) sig = await hmac(sig, c)
		if (!timingSafeEqual(sig, fromB64url(rest[rest.length - 1]))) return null

		const decode = (s: string) => JSON.parse(new TextDecoder().decode(fromB64url(s)))
		const cap = decode(payload) as TLCapability
		let expiresAt = cap.expiresAt
		const ceilings: TLRelationCeiling[] = [...(cap.ceilings ?? [])]
		if (!isValidCaveat(cap) || typeof cap.subject !== 'string') return null
		if (cap.actingFor != null && typeof cap.actingFor !== 'string') return null
		for (const c of caveats) {
			const caveat = decode(c)
			// a caveat the holder wrote must not be able to widen the token, for example by an
			// expiry that is not a number
			if (!isValidCaveat(caveat)) return null
			const { expiresAt: e, ...ceiling } = caveat as TLCapabilityCaveat
			if (e !== undefined) expiresAt = expiresAt === undefined ? e : Math.min(expiresAt, e)
			if (ceiling.relations || ceiling.within) ceilings.push(ceiling)
		}
		if (expiresAt !== undefined && now > expiresAt) return null
		return {
			subject: cap.subject,
			actingFor: cap.actingFor ?? null,
			ceilings,
			...(expiresAt !== undefined ? { expiresAt } : {}),
		}
	} catch {
		return null
	}
}

const isStringArray = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string')

function isValidCaveat(c: any): boolean {
	if (typeof c !== 'object' || c === null) return false
	if (c.expiresAt !== undefined && !Number.isFinite(c.expiresAt)) return false
	if (c.relations !== undefined && !isStringArray(c.relations)) return false
	if (c.within !== undefined && !isStringArray(c.within)) return false
	if (c.ceilings !== undefined) {
		if (!Array.isArray(c.ceilings) || !c.ceilings.every(isValidCaveat)) return false
	}
	return true
}
