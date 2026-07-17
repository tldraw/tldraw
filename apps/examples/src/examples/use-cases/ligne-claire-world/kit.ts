// A small kit of hand-authored ligne-claire structures, written in exactly the
// format the make-3d-real model emits: a string of JSX defining `Scene`, using
// three.js primitives + drei `<Outlines>` for the black linework. These compile
// through the same pipeline as generated assets, so a footprint can point at a
// kit entry today and at a freshly generated asset tomorrow with no code change.
//
// Each Scene is authored roughly within a unit-ish cube, base sitting on y=0.
// World3d measures and re-scales it to the footprint, so exact authored scale
// doesn't matter.

const PAGODA = `
function Scene() {
  const cream = '#efe9d8'
  const roof = '#c96f4a'
  const wood = '#6b4f37'
  const O = (p) => <Outlines thickness={4} color="#2b2b2b" {...p} />
  const Tier = ({ y, r, h, roofR, roofH }) => (
    <group position={[0, y, 0]}>
      <mesh castShadow position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, 8]} />
        <meshToonMaterial color={cream} />
        {O()}
      </mesh>
      <mesh castShadow position={[0, h + roofH / 2, 0]}>
        <coneGeometry args={[roofR, roofH, 8]} />
        <meshToonMaterial color={roof} />
        {O()}
      </mesh>
    </group>
  )
  return (
    <group>
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[2.4, 2.4, 0.2, 32]} />
        <meshToonMaterial color="#eae4d2" />
        {O()}
      </mesh>
      <Tier y={0.2} r={1.6} h={1.0} roofR={2.1} roofH={0.7} />
      <Tier y={1.9} r={1.2} h={0.85} roofR={1.65} roofH={0.6} />
      <Tier y={3.35} r={0.85} h={0.7} roofR={1.25} roofH={0.55} />
      <mesh castShadow position={[0, 4.55, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshToonMaterial color={wood} />
        {O()}
      </mesh>
      <mesh position={[0, 5.05, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
        <meshToonMaterial color={wood} />
      </mesh>
      <mesh position={[0.18, 5.35, 0]}>
        <boxGeometry args={[0.3, 0.2, 0.02]} />
        <meshToonMaterial color={roof} />
        {O()}
      </mesh>
    </group>
  )
}
`

const HOUSE = `
function Scene() {
  const wall = '#e9e2cf'
  const roof = '#b0563c'
  const O = (p) => <Outlines thickness={4} color="#2b2b2b" {...p} />
  return (
    <group>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.2, 1.4]} />
        <meshToonMaterial color={wall} />
        {O()}
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.5, 0.9, 4]} />
        <meshToonMaterial color={roof} />
        {O()}
      </mesh>
      <mesh position={[0, 0.5, 0.71]}>
        <boxGeometry args={[0.4, 0.7, 0.04]} />
        <meshToonMaterial color="#6b4f37" />
        {O()}
      </mesh>
    </group>
  )
}
`

const TORII = `
function Scene() {
  const red = '#c1442e'
  const dark = '#2b2b2b'
  const O = (p) => <Outlines thickness={4} color="#2b2b2b" {...p} />
  const Post = ({ x }) => (
    <mesh castShadow position={[x, 1.5, 0]}>
      <cylinderGeometry args={[0.16, 0.2, 3, 10]} />
      <meshToonMaterial color={red} />
      {O()}
    </mesh>
  )
  return (
    <group>
      <Post x={-1.1} />
      <Post x={1.1} />
      <mesh castShadow position={[0, 2.3, 0]}>
        <boxGeometry args={[2.7, 0.22, 0.28]} />
        <meshToonMaterial color={red} />
        {O()}
      </mesh>
      <mesh castShadow position={[0, 2.85, 0]}>
        <boxGeometry args={[3.2, 0.28, 0.4]} />
        <meshToonMaterial color={red} />
        {O()}
      </mesh>
      <mesh castShadow position={[0, 3.08, 0]}>
        <boxGeometry args={[3.4, 0.16, 0.44]} />
        <meshToonMaterial color={dark} />
        {O()}
      </mesh>
      <mesh position={[0, 2.55, 0.16]}>
        <boxGeometry args={[0.4, 0.35, 0.05]} />
        <meshToonMaterial color="#efe9d8" />
        {O()}
      </mesh>
    </group>
  )
}
`

const SHRINE = `
function Scene() {
  const wall = '#efe9d8'
  const roof = '#4f5b52'
  const wood = '#8a5a3b'
  const O = (p) => <Outlines thickness={4} color="#2b2b2b" {...p} />
  return (
    <group>
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[3, 0.4, 2.4]} />
        <meshToonMaterial color={wood} />
        {O()}
      </mesh>
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[2.2, 1.2, 1.7]} />
        <meshToonMaterial color={wall} />
        {O()}
      </mesh>
      <mesh castShadow position={[0, 2.05, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 0.7, 1.35]}>
        <coneGeometry args={[2.1, 1.1, 4]} />
        <meshToonMaterial color={roof} />
        {O()}
      </mesh>
      <mesh position={[0, 0.9, 0.86]}>
        <boxGeometry args={[0.5, 0.9, 0.05]} />
        <meshToonMaterial color={wood} />
        {O()}
      </mesh>
    </group>
  )
}
`

const BRIDGE = `
function Scene() {
  const wood = '#9c6b3f'
  const dark = '#5e3d21'
  const O = (p) => <Outlines thickness={4} color="#2b2b2b" {...p} />
  const N = 9
  const span = 4.4
  const rise = 1.1
  const base = 0.3
  const seg = span / N + 0.06
  const planks = []
  const posts = []
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const x = (t - 0.5) * span
    const y = rise * Math.sin(t * Math.PI) + base
    const ang = Math.atan((rise * Math.PI * Math.cos(t * Math.PI)) / span)
    planks.push(
      <group key={i} position={[x, y, 0]} rotation={[0, 0, ang]}>
        <mesh castShadow>
          <boxGeometry args={[seg, 0.14, 1.5]} />
          <meshToonMaterial color={wood} />
          {O()}
        </mesh>
        <mesh position={[0, 0.42, 0.66]}>
          <boxGeometry args={[seg, 0.08, 0.08]} />
          <meshToonMaterial color={dark} />
        </mesh>
        <mesh position={[0, 0.42, -0.66]}>
          <boxGeometry args={[seg, 0.08, 0.08]} />
          <meshToonMaterial color={dark} />
        </mesh>
      </group>
    )
    if (i % 2 === 0) {
      for (const z of [0.66, -0.66]) {
        posts.push(
          <mesh key={i + '_' + z} castShadow position={[x, y + 0.24, z]}>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshToonMaterial color={dark} />
            {O()}
          </mesh>
        )
      }
    }
  }
  return (
    <group>
      {planks}
      {posts}
    </group>
  )
}
`

export const KIT: Record<string, string> = {
	pagoda: PAGODA,
	house: HOUSE,
	torii: TORII,
	shrine: SHRINE,
	bridge: BRIDGE,
}

export type KitName = keyof typeof KIT

// Each asset has a canonical 2D footprint so the plan reads as what it builds:
// a pagoda is a circle, a bridge and a torii are rectangles of the right aspect.
// Assigning an asset snaps the shape to this, and the 3D asset scales to whatever
// size and rotation the shape then has — so the 2D shape faithfully represents
// the 3D footprint.
export interface AssetSpec {
	geo: 'ellipse' | 'rectangle'
	aspect: number // width : depth of the natural footprint
}

export const ASSET_SPEC: Record<KitName, AssetSpec> = {
	pagoda: { geo: 'ellipse', aspect: 1 },
	shrine: { geo: 'rectangle', aspect: 1.25 },
	torii: { geo: 'rectangle', aspect: 6 },
	bridge: { geo: 'rectangle', aspect: 2.9 },
	house: { geo: 'rectangle', aspect: 1.3 },
}
