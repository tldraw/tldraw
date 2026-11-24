// Render macOS's pointing hand and I-beam cursors to 2x PNGs for shoot.mjs.
//
//   swift render-macos-cursors.swift <out-dir>
//   CLIPS_SYSTEM_CURSORS=<out-dir> node shoot.mjs ...
//
// Apple's artwork can't be checked into this public repo, so this renders it from the copy every
// Mac ships. Without it, shoot.mjs draws tldraw's arrow for `pointer` and `text` cursors.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let cursors = "/System/Library/Frameworks/ApplicationServices.framework/Versions/A/Frameworks/HIServices.framework/Versions/A/Resources/cursors"
let outDir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "."
try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

for (name, file) in [("pointinghand", "pointinghand.png"), ("ibeamhorizontal", "ibeam.png")] {
	guard let doc = CGPDFDocument(URL(fileURLWithPath: "\(cursors)/\(name)/cursor.pdf") as CFURL),
		let page = doc.page(at: 1)
	else {
		FileHandle.standardError.write("Couldn't read the \(name) cursor\n".data(using: .utf8)!)
		exit(1)
	}
	let box = page.getBoxRect(.mediaBox)
	let ctx = CGContext(
		data: nil, width: Int(box.width * 2), height: Int(box.height * 2), bitsPerComponent: 8,
		bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!,
		bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
	ctx.scaleBy(x: 2, y: 2)
	ctx.drawPDFPage(page)
	let url = URL(fileURLWithPath: outDir).appendingPathComponent(file)
	let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
	CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
	CGImageDestinationFinalize(dest)
	print(url.path)
}
