function doGet() {
	return HtmlService.createTemplateFromFile('index')
		.evaluate()
		.addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
}
