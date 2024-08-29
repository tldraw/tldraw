import { GetServerTimeResponseBody } from '@tldraw/dotcom-shared'
import { isEditorUnlicensed, LicenseManager } from '@tldraw/editor'
import { IRequest } from 'itty-router'
interface ServerTimeRequestBody {
	licenseKey: string
}

export async function getServerTime(req: IRequest): Promise<Response> {
	const { licenseKey } = (await req.json()) as ServerTimeRequestBody

	const licenseManager = new LicenseManager('')
	const licenseInfo = await licenseManager.getLicenseFromKey(licenseKey)
	if (isEditorUnlicensed(licenseInfo)) {
		return new Response(JSON.stringify({ error: true, message: 'Invalid license key' }), {
			status: 400,
		})
	}
	if (licenseInfo.isLicenseParseable && !licenseInfo.hasFeatureTimerSync) {
		return new Response(
			JSON.stringify({ error: true, message: 'License does not have the required feature' }),
			{ status: 403 }
		)
	}

	return new Response(
		JSON.stringify({ serverTime: Date.now() } satisfies GetServerTimeResponseBody)
	)
}
