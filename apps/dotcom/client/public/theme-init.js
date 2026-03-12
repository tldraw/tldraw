// flashbang protection, runs before CSS loads
;(function () {
	try {
		// this is our v3 STORAGE_KEY
		var stored = localStorage.getItem('tldrawapp_session_3')
		if (stored) {
			var parsed = JSON.parse(stored)
			if (parsed && parsed.theme) {
				// Always set data-theme to prevent CSS media query fallback from overriding user preference
				document.documentElement.setAttribute('data-theme', parsed.theme)
				// this helps with safari
				if (parsed.theme === 'dark') {
					// this is the same as --tl-color-background, if you ever update that, update this too
					document.documentElement.style.backgroundColor = 'hsl(240, 5%, 6.5%)' 
					document.documentElement.style.colorScheme = 'dark'
				} else if (parsed.theme === 'light') {
					// this is the same as --tl-color-background, if you ever update that, update this too
					document.documentElement.style.backgroundColor = 'hsl(210, 20%, 98%)'
					document.documentElement.style.colorScheme = 'light'
				}
			}
		}
	} catch (e) {
		// noop
	}
})()
