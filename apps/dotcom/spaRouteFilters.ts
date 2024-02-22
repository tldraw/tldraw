// This value is used to configure Vercel routing to rewrite dotcom SPA routes to /index.html.
// It is also tested in routes.test.ts to make sure it matches all React Router routes.
//
// It is a list of string-encoded regexes matching SPA routes to be spliced into
// Vercel's "build output spec" in scripts/build.ts.
//
// Make sure it's not overly broad, because otherwise we won't give correct 404 responses.
export const SPA_ROUTE_FILTERS = ['^/$', '^/r/?$', '^/new/?$', '^/r/.*', '^/s/.*', '^/v/.*']
