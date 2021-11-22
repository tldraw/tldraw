import { TldrawApp, TDFile } from '@tldraw/tldraw'
import pretty from "pretty"


// Create the text content of an SVG file that also embeds the Tldraw file content
export function toSVG(app: TldrawApp, currentFile: TDFile){
    let prettySVG; 

    if(app.page.shapes.length){
        prettySVG = pretty(app.copySvg(Object.keys(app.page.shapes), app.page.id));
    } else {
        prettySVG = pretty(app.copySvg());
    }
    
    const svgText = prettySVG.replace("</svg>", 
`<!-- svg-source:tldraw -->
<!-- payload-type:application/vnd.tldraw+json --><!-- payload-version:2 --><!-- payload-start -->\n
${JSON.stringify({ ...currentFile, document: app.document, assets: {} }, null, "  ")}
<!-- payload-end -->
</svg>`);

    return svgText;
}

// Extract the Tldraw file content from an SVG file
export function fromSVG(svgText:string):string {
    // NOTE: If the data wasn't found in this search logic, this function will return "", which then will fail to parse
    // and we'll treat it as a new file (see getInitialFile() in src/app.tsx)
    return svgText.slice(svgText.search("payload-start -->")+"payload-start -->".length, svgText.search("<!-- payload-end -->"));
}