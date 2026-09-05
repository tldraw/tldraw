// The one button component shared by every frame on the canvas. It carries no
// variant logic at all — its stylesheet (see FRAME_HTML in buttonTokens.ts)
// reads CSS custom properties, and each frame supplies the values.
export function LabButton({ label }: { label: string }) {
	return <button className="lab-button">{label}</button>
}
