import { OAUTH_CONSENT_OUTCOMES, OAuthConsentBeaconRequestBody } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'

// The OAuth consent page's own telemetry sink. That page renders Clerk's <OAuthConsent> for MCP and
// plugin sign-ins (apps/dotcom/client/src/tla/pages/oauth-consent.tsx); it sits outside the app's
// analytics providers and can run before Clerk has booted, so it cannot use PostHog and POSTs one
// bounded outcome here instead. This is the only direct view we have of the page — a granted consent
// is otherwise only observable once the client reaches the MCP server (mcp_server_initialize).
//
// Unauthenticated by design: there is no session or token at this point in the flow, and the body is
// a single closed-vocabulary enum, so a forged POST can only add a bounded, named value to the
// dataset — nothing downstream reads it. Registered after blockUnknownOrigins, which keeps it
// same-origin.
export async function postOAuthConsentBeacon(
	request: IRequest,
	env: Environment
): Promise<Response> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: true }, { status: 400 })
	}

	const outcome = (body as Partial<OAuthConsentBeaconRequestBody> | null)?.outcome
	// `includes` on the readonly tuple narrows a bare string to the union, so a value outside the
	// vocabulary is rejected rather than written to the dataset.
	if (
		typeof outcome !== 'string' ||
		!(OAUTH_CONSENT_OUTCOMES as readonly string[]).includes(outcome)
	) {
		return Response.json({ error: true }, { status: 400 })
	}

	// One datapoint per consent-page outcome, on the same MEASURE dataset as the mcp_server_* events so
	// the OAuth flow reads as one funnel: this page's page_shown, then the client's mcp_server_initialize.
	writeDataPoint(undefined, env.MEASURE, env, 'mcp_oauth_consent', {
		blobs: [`outcome:${outcome}`],
	})
	return Response.json({ error: false })
}
