import { TldrawApp } from '@tldraw/tldraw'
import pretty from "pretty"


// Create the text content of an SVG file that also embeds the Tldraw file content
export function toSVG(tldr: TldrawApp){
    const prettySVG = pretty(tldr.copySvg());
    const svgText = prettySVG.replace("</svg>", 
`<!-- svg-source:tldraw -->
<!-- payload-type:application/vnd.tldraw+json --><!-- payload-version:2 --><!-- payload-start -->
${JSON.stringify(tldr.document, null, "  ")}
<!-- payload-end -->
</svg>`);

    return svgText;
}

// Extract the Tldraw file content from an SVG file
export function fromSVG(svgText) {
    return svgText.slice(svgText.search("payload-start -->")+"payload-start -->".length, svgText.search("<!-- payload-end -->"));
}