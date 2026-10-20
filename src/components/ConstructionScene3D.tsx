import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef, type ReactNode } from "react";

export type Prog = { target: number; value: number };

const FLOORS = 9;
const FH = 1.3;
const W = 10;
const D = 7;
const BX = 3; // building centre x
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const builtOf = (v: number) => seg(v, 0.2, 0.6) * FLOORS;
const facOf = (v: number) => seg(v, 0.6, 0.82) * FLOORS;
const finOf = (v: number) => seg(v, 0.84, 0.96);
const topOf = (v: number) => 0.4 + Math.min(FLOORS, builtOf(v)) * FH;

type V3 = [number, number, number];
const std = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });

const M = {
  concrete: std("#b8b2a6", { roughness: 0.95 }),
  concreteDark: std("#8c877c"),
  steel: std("#7a828c", { metalness: 0.75, roughness: 0.35 }),
  yellow: std("#f5b700", { roughness: 0.45, metalness: 0.25 }),
  white: std("#eceef0", { roughness: 0.6 }),
  navy: std("#1f3d68", { roughness: 0.55 }),
  grey: std("#6c6f75", { roughness: 0.6 }),
  wood: std("#a87a44", { roughness: 0.85 }),
  glass: new THREE.MeshStandardMaterial({ color: "#1a2a3c", metalness: 0.9, roughness: 0.08, emissive: new THREE.Color("#ffc977"), emissiveIntensity: 0 }),
  rail: std("#dfe3e7", { metalness: 0.8, roughness: 0.3 }),
  soil: std("#4e3b2a", { roughness: 1 }),
  pit: std("#2d2219", { roughness: 1 }),
  brick: std("#9a4a32", { roughness: 0.9 }),
  skin: std("#b98261", { roughness: 0.7 }),
  vest: std("#ff7417", { emissive: new THREE.Color("#ff5a00"), emissiveIntensity: 0.25, roughness: 0.6 }),
  stripe: std("#e8e8e8", { metalness: 0.9, roughness: 0.2 }),
  hat: std("#ffd000", { roughness: 0.3, metalness: 0.1 }),
  pants: std("#27344d"),
  boot: std("#2a1d14"),
  tire: std("#151515", { roughness: 0.9 }),
  leaf: std("#3d7a3a"),
  trunk: std("#5a3e2a"),
  grass: std("#4a7f39", { roughness: 1 }),
  rebar: std("#7b4527", { metalness: 0.5 }),
  drum: std("#e8e4dc", { metalness: 0.3, roughness: 0.5 }),
  orange: std("#e2661b"),
  spark: new THREE.MeshBasicMaterial({ color: "#bfe4ff" }),
};

function B({ p, s, m, r }: { p: V3; s: V3; m: THREE.Material; r?: V3 }) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Rod({ a, b, r = 0.04, m }: { a: V3; b: V3; r?: number; m: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: va.add(vb).multiplyScalar(0.5), quat: q, len: dir.length() };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} material={m} castShadow>
      <cylinderGeometry args={[r, r, len, 6]} />
    </mesh>
  );
}

/* ---------- Building ---------- */
const COLS: V3[] = [-W / 2, 0, W / 2].flatMap((x) => [-D / 2, D / 2].map((z) => [x, 0, z] as V3));

function Floor({ i, prog }: { i: number; prog: Prog }) {
  const cols = useRef<THREE.Group>(null);
  const slab = useRef<THREE.Mesh>(null);
  const fac = useRef<THREE.Group>(null);
  const bars = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = prog.value;
    const local = clamp(builtOf(v) - i);
    const f = clamp(facOf(v) - i);
    cols.current!.visible = local > 0.001;
    cols.current!.scale.y = Math.max(local, 0.001);
    slab.current!.visible = local > 0.97;
    bars.current!.visible = local > 0.02 && local < 0.97;
    bars.current!.position.y = local * FH;
    fac.current!.visible = f > 0.001;
    fac.current!.scale.set(1, Math.max(f, 0.001), 1);
  });
  const y = 0.4 + i * FH;
  const h = FH - 0.22;
  const zf = D / 2;
  return (
    <group position={[0, y, 0]}>
      <group ref={cols}>
        {COLS.map((c, k) => <B key={k} p={[c[0], FH / 2, c[2]]} s={[0.38, FH, 0.38]} m={M.concrete} />)}
      </group>
      <group ref={bars}>
        {COLS.map((c, k) => <B key={k} p={[c[0], 0.25, c[2]]} s={[0.05, 0.5, 0.05]} m={M.rebar} />)}
      </group>
      <mesh ref={slab} position={[0, FH - 0.11, 0]} material={M.concrete} castShadow receiveShadow>
        <boxGeometry args={[W + 0.7, 0.22, D + 0.7]} />
      </mesh>
      <group ref={fac}>
        {/* front facade: grey | navy | white sections */}
        <B p={[-3.5, h / 2, zf]} s={[3, h, 0.22]} m={M.grey} />
        <B p={[-0.5, h / 2, zf]} s={[3, h, 0.22]} m={M.navy} />
        <B p={[3, h / 2, zf]} s={[4, h, 0.22]} m={M.white} />
        <B p={[-2.05, h / 2, zf + 0.05]} s={[0.12, h, 0.3]} m={M.wood} />
        <B p={[-3.5, h * 0.55, zf + 0.12]} s={[0.5, 0.5, 0.05]} m={M.glass} />
        {[-1.2, 0.2].map((x) => <B key={x} p={[x, h * 0.55, zf + 0.12]} s={[0.45, 0.45, 0.05]} m={M.glass} />)}
        {[2.1, 3.9].map((x) => <B key={x} p={[x, h * 0.5, zf + 0.12]} s={[1.1, 0.8, 0.05]} m={M.glass} />)}
        {/* balcony */}
        <B p={[3, 0.04, zf + 0.5]} s={[4.3, 0.08, 0.9]} m={M.white} />
        <B p={[3, 0.32, zf + 0.93]} s={[4.3, 0.04, 0.04]} m={M.rail} />
        {[1, 2, 3, 4, 5].map((k) => <B key={k} p={[0.95 + k * 0.7, 0.18, zf + 0.93]} s={[0.03, 0.3, 0.03]} m={M.rail} />)}
        {/* sides & back */}
        <B p={[W / 2, h / 2, 0]} s={[0.22, h, D]} m={M.white} />
        {[-1.6, 1.6].map((z) => <B key={z} p={[W / 2 + 0.12, h * 0.5, z]} s={[0.05, 0.8, 1.2]} m={M.glass} />)}
        <B p={[-W / 2, h / 2, 0]} s={[0.22, h, D]} m={M.white} />
        <B p={[0, h / 2, -zf]} s={[W, h, 0.22]} m={M.white} />
      </group>
    </group>
  );
}

function Groundworks({ prog }: { prog: Prog }) {
  const pit = useRef<THREE.Mesh>(null);
  const mound = useRef<THREE.Mesh>(null);
  const fnd = useRef<THREE.Mesh>(null);
  const bars = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = prog.value;
    const e = seg(v, 0, 0.1), f = seg(v, 0.1, 0.2);
    pit.current!.scale.set(Math.max(e, 0.01), 1, Math.max(e, 0.01));
    mound.current!.scale.set(2.6 * e + 0.01, 1.2 * e * (1 - finOf(v)) + 0.01, 2 * e + 0.01);
    fnd.current!.visible = f > 0.001;
    fnd.current!.scale.y = Math.max(f, 0.001);
    bars.current!.visible = e > 0.6 && v < 0.24;
  });
  return (
    <group>
      <mesh ref={pit} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} material={M.pit} receiveShadow>
        <planeGeometry args={[W + 2, D + 2]} />
      </mesh>
      <mesh ref={mound} position={[-9, 0, -4]} material={M.soil} castShadow receiveShadow>
        <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh ref={fnd} position={[0, 0.2, 0]} material={M.concreteDark} castShadow receiveShadow>
        <boxGeometry args={[W + 1, 0.4, D + 1]} />
      </mesh>
      <group ref={bars}>
        {Array.from({ length: 11 }).map((_, k) => <B key={`x${k}`} p={[-W / 2 + k, 0.45, 0]} s={[0.04, 0.04, D]} m={M.rebar} />)}
        {Array.from({ length: 8 }).map((_, k) => <B key={`z${k}`} p={[0, 0.45, -D / 2 + k]} s={[W, 0.04, 0.04]} m={M.rebar} />)}
      </group>
    </group>
  );
}

function Scaffold({ prog }: { prog: Prog }) {
  const poles = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const planks = useRef<THREE.Group>(null);
  useFrame(() => {
    const v = prog.value;
    const fin = finOf(v);
    root.current!.visible = builtOf(v) > 0.05 && fin < 0.4;
    poles.current!.scale.y = topOf(v) + 1;
    const b = builtOf(v);
    planks.current!.children.forEach((c, i) => (c.visible = i < Math.floor(b + 0.03)));
  });
  const zf = D / 2 + 1.3, xs = W / 2 + 1.3;
  const front = [-5.6, -3.4, -1.1, 1.1, 3.4, 5.6];
  const side = [-3.4, -1.1, 1.1, 3.4];
  return (
    <group ref={root}>
      <group ref={poles}>
        {front.flatMap((x) => [zf, zf - 0.8].map((z) => <B key={`${x}${z}`} p={[x, 0.5, z]} s={[0.06, 1, 0.06]} m={M.steel} />))}
        {side.flatMap((z) => [xs, xs - 0.8].map((x) => <B key={`${x}${z}`} p={[x, 0.5, z]} s={[0.06, 1, 0.06]} m={M.steel} />))}
      </group>
      <group ref={planks}>
        {Array.from({ length: FLOORS }).map((_, i) => (
          <group key={i} position={[0, 0.4 + (i + 1) * FH, 0]}>
            <B p={[0, 0.02, zf - 0.4]} s={[11.4, 0.05, 0.75]} m={M.wood} />
            <B p={[0, 0.55, zf]} s={[11.4, 0.04, 0.04]} m={M.steel} />
            <B p={[xs - 0.4, 0.02, 0]} s={[0.75, 0.05, 7]} m={M.wood} />
            <B p={[xs, 0.55, 0]} s={[0.04, 0.04, 7]} m={M.steel} />
          </group>
        ))}
      </group>
    </group>
  );
}

function Finish({ prog }: { prog: Prog }) {
  const g = useRef<THREE.Group>(null);
  const parapet = useRef<THREE.Group>(null);
  useFrame(() => {
    const fin = finOf(prog.value);
    g.current!.visible = fin > 0.001;
    g.current!.children.forEach((c) => c.scale.setScalar(Math.max(fin, 0.001)));
    parapet.current!.visible = facOf(prog.value) >= FLOORS - 0.01;
    M.glass.emissiveIntensity = fin * 1.4;
  });
  const top = 0.4 + FLOORS * FH;
  return (
    <>
      <group ref={parapet} position={[0, top, 0]}>
        <B p={[0, 0.3, D / 2]} s={[W + 0.7, 0.6, 0.2]} m={M.white} />
        <B p={[0, 0.3, -D / 2]} s={[W + 0.7, 0.6, 0.2]} m={M.white} />
        <B p={[W / 2, 0.3, 0]} s={[0.2, 0.6, D]} m={M.white} />
        <B p={[-W / 2, 0.3, 0]} s={[0.2, 0.6, D]} m={M.white} />
        <B p={[-2.5, 1, -1]} s={[2.5, 2, 2.5]} m={M.white} />
        {[-1.5, -1.2, -0.9].map((x) => <B key={x} p={[x, 1.2, 0.27]} s={[0.12, 1.2, 0.05]} m={M.wood} />)}
      </group>
      <group ref={g}>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 7.5]} material={M.grass} receiveShadow>
          <planeGeometry args={[W + 8, 6]} />
        </mesh>
        {[-8, -5, 7, 10].map((x) => (
          <group key={x} position={[x, 0, 9]}>
            <mesh position={[0, 0.6, 0]} material={M.trunk} castShadow><cylinderGeometry args={[0.1, 0.14, 1.2, 8]} /></mesh>
            <mesh position={[0, 1.7, 0]} material={M.leaf} castShadow><icosahedronGeometry args={[0.9, 1]} /></mesh>
          </group>
        ))}
        <group position={[0, 0, 10.5]}>
          {Array.from({ length: 9 }).map((_, k) => <B key={k} p={[-10 + k * 2.6, 0.5, 0]} s={[2.2, 1, 0.25]} m={M.brick} />)}
        </group>
        <B p={[-0.5, 0.75, D / 2 + 0.8]} s={[2.4, 1.5, 1.2]} m={M.brick} />
      </group>
    </>
  );
}

/* ---------- Machinery ---------- */
function Crane({ prog }: { prog: Prog }) {
  const root = useRef<THREE.Group>(null);
  const slew = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const cable = useRef<THREE.Mesh>(null);
  const H = 17;
  useFrame(({ clock }) => {
    const v = prog.value, t = clock.elapsedTime;
    root.current!.visible = finOf(v) < 0.25;
    slew.current!.rotation.y = -0.25 + Math.sin(t * 0.35) * 0.32;
    const tx = -6 - Math.sin(t * 0.5) * 3.5;
    trolley.current!.position.x = tx;
    const drop = Math.max(1.2, H - (topOf(v) + 2.2) + Math.sin(t * 0.7) * 0.8);
    trolley.current!.children[1].position.y = -drop;
    cable.current!.scale.y = drop;
    cable.current!.position.y = -drop / 2;
  });
  const braces = Array.from({ length: 12 });
  return (
    <group ref={root} position={[BX + 9, 0, -3]}>
      <B p={[0, 0.3, 0]} s={[2.2, 0.6, 2.2]} m={M.concreteDark} />
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z]) => <B key={`${x}${z}`} p={[x, H / 2, z]} s={[0.12, H, 0.12]} m={M.yellow} />)}
      {braces.map((_, k) => {
        const y0 = 0.6 + k * 1.4, y1 = y0 + 1.4;
        return (
          <group key={k}>
            <Rod a={[-0.5, y0, 0.5]} b={[0.5, y1, 0.5]} r={0.03} m={M.yellow} />
            <Rod a={[0.5, y0, -0.5]} b={[-0.5, y1, -0.5]} r={0.03} m={M.yellow} />
            <Rod a={[0.5, y0, 0.5]} b={[0.5, y1, -0.5]} r={0.03} m={M.yellow} />
            <Rod a={[-0.5, y0, -0.5]} b={[-0.5, y1, 0.5]} r={0.03} m={M.yellow} />
          </group>
        );
      })}
      <group ref={slew} position={[0, H, 0]}>
        <B p={[-7, 0.25, 0]} s={[15, 0.5, 0.6]} m={M.yellow} />
        <B p={[2.5, 0.25, 0]} s={[5, 0.5, 0.8]} m={M.yellow} />
        <B p={[4.3, -0.3, 0]} s={[1.4, 1.1, 1.2]} m={M.concrete} />
        <B p={[0.9, -0.5, 0.75]} s={[1.1, 1, 1]} m={M.white} />
        <B p={[0.9, -0.45, 1.26]} s={[0.9, 0.6, 0.03]} m={M.glass} />
        <B p={[0, 1.8, 0]} s={[0.5, 3.2, 0.5]} m={M.yellow} />
        <Rod a={[0, 3.3, 0]} b={[-12, 0.5, 0]} r={0.025} m={M.steel} />
        <Rod a={[0, 3.3, 0]} b={[4.5, 0.5, 0]} r={0.025} m={M.steel} />
        <mesh position={[0, 3.5, 0]}><sphereGeometry args={[0.12, 8, 8]} /><meshBasicMaterial color="#ff3030" /></mesh>
        <group ref={trolley} position={[-6, 0, 0]}>
          <B p={[0, -0.1, 0]} s={[0.6, 0.25, 0.7]} m={M.steel} />
          <group>
            <B p={[0, -0.15, 0]} s={[0.35, 0.3, 0.35]} m={M.orange} />
            <B p={[0, -0.75, 0]} s={[3.4, 0.28, 0.22]} m={M.steel} />
            <B p={[0, -0.75, 0]} s={[3.4, 0.05, 0.4]} m={M.steel} />
          </group>
          <mesh ref={cable} material={M.steel}><cylinderGeometry args={[0.02, 0.02, 1, 4]} /></mesh>
        </group>
      </group>
    </group>
  );
}

function Excavator({ prog }: { prog: Prog }) {
  const root = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const boom = useRef<THREE.Group>(null);
  const stick = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const v = prog.value, t = clock.elapsedTime;
    root.current!.visible = v < 0.34;
    root.current!.position.x = -9 - seg(v, 0.18, 0.32) * 14;
    upper.current!.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.5;
    boom.current!.rotation.z = -0.35 + Math.sin(t * 1.2) * 0.25;
    stick.current!.rotation.z = -1.1 + Math.sin(t * 1.2 + 1) * 0.4;
  });
  return (
    <group ref={root} position={[-9, 0, 3.5]} rotation-y={-0.3}>
      {[-0.75, 0.75].map((z) => (
        <group key={z}>
          <B p={[0, 0.3, z]} s={[2.8, 0.6, 0.55]} m={M.tire} />
          {[-1, -0.33, 0.33, 1].map((x) => <B key={x} p={[x, 0.3, z * 1.04]} s={[0.3, 0.3, 0.56]} m={M.steel} />)}
        </group>
      ))}
      <group ref={upper} position={[0, 0.65, 0]}>
        <B p={[0, 0.4, 0]} s={[2.2, 0.8, 1.8]} m={M.yellow} />
        <B p={[-0.9, 0.5, 0]} s={[0.5, 0.9, 1.7]} m={M.concreteDark} />
        <B p={[0.45, 1.15, 0.45]} s={[0.9, 0.9, 0.8]} m={M.yellow} />
        <B p={[0.92, 1.15, 0.45]} s={[0.04, 0.7, 0.7]} m={M.glass} />
        <group ref={boom} position={[0.9, 0.8, -0.3]}>
          <B p={[1.2, 0, 0]} s={[2.5, 0.32, 0.3]} m={M.yellow} />
          <group ref={stick} position={[2.4, 0, 0]}>
            <B p={[0.85, 0, 0]} s={[1.8, 0.24, 0.24]} m={M.yellow} />
            <B p={[1.85, -0.15, 0]} s={[0.5, 0.5, 0.65]} m={M.steel} />
          </group>
        </group>
      </group>
    </group>
  );
}

function MixerTruck({ prog }: { prog: Prog }) {
  const root = useRef<THREE.Group>(null);
  const drum = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const v = prog.value;
    root.current!.visible = v > 0.04 && v < 0.42;
    root.current!.position.x = -30 + seg(v, 0.04, 0.12) * 24 - seg(v, 0.3, 0.42) * 26;
    drum.current!.rotation.x += Math.min(dt, 0.05) * 2;
  });
  return (
    <group ref={root} position={[-6, 0, 6.6]}>
      <B p={[0, 0.75, 0]} s={[4.6, 0.35, 1.7]} m={M.steel} />
      <B p={[2.5, 1.35, 0]} s={[1.3, 1.5, 1.7]} m={M.white} />
      <B p={[3.16, 1.6, 0]} s={[0.03, 0.7, 1.4]} m={M.glass} />
      <group position={[-0.4, 1.95, 0]} rotation-z={0.22}>
        <group ref={drum} rotation-z={Math.PI / 2}>
          <mesh material={M.drum} castShadow><cylinderGeometry args={[0.8, 0.95, 3, 14]} /></mesh>
          {[-0.8, 0, 0.8].map((y) => <mesh key={y} position={[0, y, 0]} material={M.orange} rotation-y={y}><torusGeometry args={[0.9, 0.05, 6, 14]} /></mesh>)}
        </group>
      </group>
      {[-1.6, -0.6, 2.4].flatMap((x) => [-0.85, 0.85].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.42, z]} rotation-x={Math.PI / 2} material={M.tire} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.3, 14]} />
        </mesh>
      )))}
    </group>
  );
}

/* ---------- Workers ---------- */
type Task = "walk" | "carry" | "hammer" | "weld" | "guide" | "shovel";
type WorkerDef = { task: Task; pos: V3; rot?: number; from: number; to: number; level?: "top" | "facade"; range?: number };

function Limb({ children, at, refObj }: { children: ReactNode; at: V3; refObj: React.RefObject<THREE.Group | null> }) {
  return <group ref={refObj} position={at}>{children}</group>;
}

function Worker({ def, prog, seed }: { def: WorkerDef; prog: Prog; seed: number }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const lL = useRef<THREE.Group>(null), rL = useRef<THREE.Group>(null);
  const lA = useRef<THREE.Group>(null), rA = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const v = prog.value, t = clock.elapsedTime + seed * 1.7;
    const show = v >= def.from && v <= def.to;
    root.current!.visible = show;
    if (!show) return;
    let y = def.pos[1];
    if (def.level === "top") y = 0.4 + Math.floor(Math.min(FLOORS, builtOf(v))) * FH;
    if (def.level === "facade") y = 0.4 + Math.min(FLOORS - 1, Math.floor(facOf(v))) * FH + FH + 0.04;
    let x = def.pos[0], rotY = def.rot ?? 0;
    const walking = def.task === "walk" || def.task === "carry";
    if (walking) {
      const r = def.range ?? 4;
      const ph = (t * 0.25) % 2;
      const k = ph < 1 ? ph : 2 - ph;
      x = def.pos[0] + (k - 0.5) * 2 * r;
      rotY = ph < 1 ? Math.PI / 2 : -Math.PI / 2;
    }
    root.current!.position.set(x, y, def.pos[2]);
    root.current!.rotation.y = rotY;
    const s = Math.sin(t * 6);
    const reset = () => [lL, rL, lA, rA].forEach((r) => r.current!.rotation.set(0, 0, 0));
    reset();
    body.current!.rotation.x = 0;
    body.current!.position.y = 0;
    spark.current!.visible = false;
    if (walking) {
      lL.current!.rotation.x = s * 0.6;
      rL.current!.rotation.x = -s * 0.6;
      if (def.task === "carry") {
        lA.current!.rotation.x = -2.6;
        rA.current!.rotation.x = -2.6;
      } else {
        lA.current!.rotation.x = -s * 0.5;
        rA.current!.rotation.x = s * 0.5;
      }
      body.current!.position.y = Math.abs(s) * 0.03;
    } else if (def.task === "hammer") {
      rA.current!.rotation.x = -1.6 - Math.max(0, Math.sin(t * 5)) * 1.2;
      lA.current!.rotation.x = -0.6;
      body.current!.rotation.x = 0.25;
    } else if (def.task === "weld") {
      lL.current!.rotation.x = -1.5;
      rL.current!.rotation.x = 0.3;
      body.current!.position.y = -0.35;
      body.current!.rotation.x = 0.4;
      lA.current!.rotation.x = -1.2;
      rA.current!.rotation.x = -1.3 + Math.sin(t * 2) * 0.08;
      spark.current!.visible = Math.sin(t * 37) > -0.3;
      spark.current!.scale.setScalar(0.6 + Math.random() * 0.8);
    } else if (def.task === "guide") {
      rA.current!.rotation.z = 2.6 + Math.sin(t * 3) * 0.4;
      lA.current!.rotation.z = -0.3;
    } else if (def.task === "shovel") {
      body.current!.rotation.x = 0.45 + Math.sin(t * 2.4) * 0.2;
      lA.current!.rotation.x = -1 + Math.sin(t * 2.4) * 0.3;
      rA.current!.rotation.x = -0.8 + Math.sin(t * 2.4) * 0.3;
    }
  });
  const carry = def.task === "carry";
  return (
    <group ref={root} scale={0.48}>
      <Limb at={[-0.1, 0.9, 0]} refObj={lL}><B p={[0, -0.42, 0]} s={[0.16, 0.84, 0.18]} m={M.pants} /><B p={[0, -0.86, 0.05]} s={[0.17, 0.1, 0.28]} m={M.boot} /></Limb>
      <Limb at={[0.1, 0.9, 0]} refObj={rL}><B p={[0, -0.42, 0]} s={[0.16, 0.84, 0.18]} m={M.pants} /><B p={[0, -0.86, 0.05]} s={[0.17, 0.1, 0.28]} m={M.boot} /></Limb>
      <group ref={body} position={[0, 0, 0]}>
        <group position={[0, 0.9, 0]}>
          <B p={[0, 0.32, 0]} s={[0.42, 0.62, 0.26]} m={M.vest} />
          <B p={[0, 0.2, 0.135]} s={[0.43, 0.05, 0.01]} m={M.stripe} />
          <B p={[0, 0.4, 0.135]} s={[0.43, 0.05, 0.01]} m={M.stripe} />
          <B p={[0, 0.2, -0.135]} s={[0.43, 0.05, 0.01]} m={M.stripe} />
          <mesh position={[0, 0.78, 0]} material={M.skin} castShadow><sphereGeometry args={[0.13, 12, 10]} /></mesh>
          <mesh position={[0, 0.84, 0]} material={M.hat} castShadow><sphereGeometry args={[0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[0, 0.84, 0.03]} material={M.hat}><cylinderGeometry args={[0.19, 0.19, 0.02, 14]} /></mesh>
          <Limb at={[-0.27, 0.58, 0]} refObj={lA}><B p={[0, -0.28, 0]} s={[0.12, 0.56, 0.12]} m={M.vest} /><B p={[0, -0.6, 0]} s={[0.1, 0.1, 0.1]} m={M.skin} /></Limb>
          <Limb at={[0.27, 0.58, 0]} refObj={rA}>
            <B p={[0, -0.28, 0]} s={[0.12, 0.56, 0.12]} m={M.vest} />
            <B p={[0, -0.6, 0]} s={[0.1, 0.1, 0.1]} m={M.skin} />
            {def.task === "hammer" && <B p={[0, -0.7, 0.15]} s={[0.05, 0.05, 0.35]} m={M.wood} />}
            {def.task === "shovel" && <B p={[0, -0.75, 0.3]} s={[0.04, 0.04, 0.9]} m={M.wood} />}
            {def.task === "weld" && <B p={[0, -0.7, 0.12]} s={[0.05, 0.05, 0.25]} m={M.steel} />}
            <mesh ref={spark} position={[0, -0.72, 0.3]} material={M.spark}><sphereGeometry args={[0.06, 6, 6]} /></mesh>
          </Limb>
          {carry && <B p={[0, 0.85, 0]} s={[0.15, 0.08, 1.6]} m={M.wood} />}
        </group>
      </group>
    </group>
  );
}

const WORKERS: WorkerDef[] = [
  { task: "shovel", pos: [-2, 0, 5.3], rot: 0.4, from: 0, to: 0.22 },
  { task: "guide", pos: [-6, 0, 6], rot: -1.2, from: 0, to: 0.3 },
  { task: "carry", pos: [-4, 0, 8], from: 0.02, to: 0.86, range: 4 },
  { task: "walk", pos: [0, 0, 6.2], from: 0.1, to: 0.95, range: 5 },
  { task: "guide", pos: [-2.5, 0, 8.8], rot: 2.6, from: 0.06, to: 0.32 },
  { task: "weld", pos: [-2.5, 0, 1.5], from: 0.21, to: 0.62, level: "top" },
  { task: "hammer", pos: [2, 0, 2], rot: 0.6, from: 0.21, to: 0.62, level: "top" },
  { task: "guide", pos: [4, 0, 2.6], rot: 0.3, from: 0.21, to: 0.84, level: "top" },
  { task: "hammer", pos: [-2.5, 0, D / 2 + 0.9], rot: Math.PI, from: 0.6, to: 0.84, level: "facade" },
  { task: "weld", pos: [2.5, 0, D / 2 + 0.9], rot: Math.PI, from: 0.6, to: 0.84, level: "facade" },
];

/* ---------- Scene ---------- */
function useGroundTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#5a4733";
    g.fillRect(0, 0, 256, 256);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 5000; i++) {
      const l = 25 + rnd() * 25;
      g.fillStyle = `hsl(30, 25%, ${l}%)`;
      g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 3, 1 + rnd() * 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 30);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Rig({ prog }: { prog: Prog }) {
  useFrame(({ camera, clock }, dt) => {
    prog.value += (prog.target - prog.value) * (1 - Math.exp(-5 * Math.min(dt, 0.05)));
    const v = prog.value, t = clock.elapsedTime;
    const narrow = window.innerWidth < 768;
    camera.position.set(-16 - v * 3 + Math.sin(t * 0.1) * 0.5, 5 + v * 7, (narrow ? 34 : 24) + v * 6);
    camera.lookAt(narrow ? 3 : -2.5, 2.5 + v * 5, 0);
  });
  return null;
}

function World({ prog, mobile }: { prog: Prog; mobile: boolean }) {
  const tex = useGroundTexture();
  const workers = mobile ? WORKERS.filter((_, i) => i % 2 === 0) : WORKERS;
  return (
    <>
      <Rig prog={prog} />
      <color attach="background" args={["#0b1a33"]} />
      <fog attach="fog" args={["#0b1a33", 40, 110]} />
      <hemisphereLight args={["#9fb6d9", "#3a2c1e", 0.7]} />
      <directionalLight
        position={[-14, 22, 16]}
        intensity={2.6}
        color="#ffe2b8"
        castShadow={!mobile}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0005}
      />
      <Environment resolution={64}>
        <Lightformer intensity={1.5} position={[0, 8, 6]} scale={[20, 6, 1]} color="#ffd9a8" />
        <Lightformer intensity={0.8} color="#7aa0d8" position={[-10, 3, -4]} rotation-y={Math.PI / 2} scale={[20, 4, 1]} />
      </Environment>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial map={tex} roughness={1} />
      </mesh>
      <group position={[BX, 0, 0]}>
        <Groundworks prog={prog} />
        {Array.from({ length: FLOORS }).map((_, i) => <Floor key={i} i={i} prog={prog} />)}
        <Scaffold prog={prog} />
        <Finish prog={prog} />
        {workers.map((w, i) => <Worker key={i} def={w} prog={prog} seed={i} />)}
      </group>
      <Crane prog={prog} />
      <Excavator prog={prog} />
      <MixerTruck prog={prog} />
    </>
  );
}

export default function ConstructionScene3D({ prog }: { prog: Prog }) {
  const mobile = typeof window !== "undefined" && window.innerWidth < 768;
  return (
    <Canvas shadows dpr={[1, mobile ? 1.25 : 1.75]} camera={{ fov: 38, position: [-16, 5, 24], near: 0.5, far: 200 }} gl={{ antialias: true }}>
      <World prog={prog} mobile={mobile} />
    </Canvas>
  );
}
