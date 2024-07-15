// HACK: `ws` has an import map mapping browser context to a dummy implementation that just
// throws an error, because it's impossible to create a websocket server in the browser
// and `ws` tries to be helpful. Unfortunately, it doesn't work well in our tests:
// we run Jest in jsdom context, because we test browser APIs, but this causes Jest
// to select the browser version of the package, which makes it impossible to run a test
// websocket server.
//
// The solution is to override `ws` exports in the Jest resolver to point to the node version
// regardless.
//
// An additional complication is that Jest seems to expect the resolver to be a CommonJS module,
// so this module is CommonJS despite the rest of the codebase being ESM.
//
// see https://jestjs.io/docs/configuration#resolver-string for docs
module.exports = function jestResolver(path, options) {
	return options.defaultResolver(path, {
		...options,
		packageFilter: (pkg) => {
			if (path === 'ws') {
				pkg.exports['.']['browser'] = './index.js'
			}
			return pkg
		},
	})
}
