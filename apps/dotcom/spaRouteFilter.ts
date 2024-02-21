// This value is used to configure Vercel routing to rewrite dotcom SPA routes to /index.html.
// It is also tested in routes.test.ts to make sure it matches all React Router routes.
//
// It is a string and not a regular expression as it's substituted
// into a string in Vercel's "build output spec" in scripts/build.ts.
//
// Make sure it's not overly broad, because otherwise we won't give correct 404 responses.
export const SPA_ROUTE_FILTER =
	'^\\/new.*' +
	'|' +
	'^\\/r' +
	'|' +
	'^\\/r\\/.*' +
	'|' +
	'^\\/s\\/.*' +
	'|' +
	'^\\/v\\/.*' +
	'|' +
	'^\\/$'
