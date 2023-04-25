window.crypto = {
	// required by nanoid
	// if we need more of the crypto apis, just add a proper mock here
	getRandomValues: function (array) {
		for (var i = 0; i < array.length; i++) {
			array[i] = Math.floor(Math.random() * 256)
		}
		return array
	},
}
