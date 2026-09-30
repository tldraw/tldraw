module.exports = {
	hooks: {
		// Local checkouts link node_modules from pnpm's shared store instead of cloning ~140k files each,
		// so worktrees install and delete in seconds. CI and Vercel both set CI and keep the standard
		// layout, which a fresh machine gains nothing from changing.
		updateConfig(config) {
			if (!process.env.CI) config.enableGlobalVirtualStore = true
			return config
		},
	},
}
