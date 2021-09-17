// This script should be used here in the build step
// 1. yarn build # Should have been called from the vscode/integrations/editor folder, this creates a 'build' folder in this folder
// 2. <run prepublish.js logic here> # Generates the initial html content in src/get-html.ts file
// 3. npm run compile # Packages up everything
// 4. # Publish to VS Code Extension Marketplace or create an installer for side loading the extension
const fs = require('fs');
const path = require('path');
// Get manifest file that contains list of the latest .js files needed by the compiled
// editor app
const manifestText = fs.readFileSync(path.resolve("./build/asset-manifest.json"), 'utf8')
const manifestJson = JSON.parse(manifestText);
// Get the HTML content of the latest editor app
const htmlText = fs.readFileSync(path.resolve("./build/index.html"), 'utf8')

const allScriptsRegex = /src="(.*?\.js)"/g
const matches = [...htmlText.matchAll(allScriptsRegex)]

// Get the contents of the code we're going to change
let getHtmlCodePath = path.resolve("./src/get-html.ts");
let getHtmlCodeText = fs.readFileSync(getHtmlCodePath, 'utf8')

// Replace the urls/paths in the 'src/get-html/ts' file with the two captured script urls
matches.forEach( (match, index) => {
	const markedLineRegex = RegExp(
		`\'(.*\.js)\'//Replace Me #${index+1}`, 
		'g')
	const lineMatches = [...getHtmlCodeText.matchAll(markedLineRegex)]
	lineMatches.forEach(lineMatch=>{
		getHtmlCodeText = getHtmlCodeText.replace(lineMatch[1], match[1]);
	})		
})

fs.writeFileSync(getHtmlCodePath, getHtmlCodeText);
