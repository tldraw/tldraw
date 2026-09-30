module.exports = {
	hooks: {
		// Worktrees link node_modules from the shared store instead of cloning ~140k files each, so they
		// install and delete in seconds. CI (Vercel sets it too) keeps the standard layout.
		//
		// The store has no hidden hoist, so a library whose types import @types/react without declaring
		// it gets `any` types. The apps that hit this map `${configDir}/node_modules/@types/*` in their
		// tsconfig `paths`. Only @types: bundlers read `paths` too, and mapping runtime packages would
		// send them past `exports`. Undeclared runtime imports go in packageExtensions instead.
		updateConfig(config) {
			if (!process.env.CI) config.enableGlobalVirtualStore = true
			return config
		},
	},
}
