/** Axis-aligned botsingsvakken in het XZ-vlak (geen fysica-engine). */
export interface Collider {
  minX: number; maxX: number; minZ: number; maxZ: number;
  /** Hoogte, voor de camera-ray. */
  height: number;
  /** Blokkeert de camera (huizen wel, lage heggen niet). */
  camBlock: boolean;
}

export function boxCollider(minX: number, maxX: number, minZ: number, maxZ: number, height: number, camBlock = true): Collider {
  return { minX, maxX, minZ, maxZ, height, camBlock };
}

/** Raakt een cirkel (x, z, r) een van de vakken? */
export function hits(colliders: Collider[], x: number, z: number, r: number): boolean {
  for (const c of colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
  }
  return false;
}

/**
 * Beweegt een cirkel per as, zodat je langs muren glijdt.
 * Geeft de nieuwe positie terug.
 */
export function moveWithCollision(colliders: Collider[], x: number, z: number, dx: number, dz: number, r: number): { x: number; z: number } {
  // Vakken waar je al in staat (bijv. een voorbijganger die tegen je aan liep) tellen niet mee,
  // anders zit je vast. Zo kun je er altijd weer uit lopen.
  const actief = colliders.some((c) => hits([c], x, z, r)) ? colliders.filter((c) => !hits([c], x, z, r)) : colliders;
  let nx = x + dx;
  if (hits(actief, nx, z, r)) nx = x;
  let nz = z + dz;
  if (hits(actief, nx, nz, r)) nz = z;
  return { x: nx, z: nz };
}

/**
 * Afstand langs een straal tot het eerste vak dat de camera blokkeert (slab-methode in 3D).
 * Geeft Infinity als er niets geraakt wordt binnen maxDist.
 */
export function rayDistance(colliders: Collider[], ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, maxDist: number): number {
  let best = Infinity;
  for (const c of colliders) {
    if (!c.camBlock) continue;
    let tmin = 0, tmax = maxDist;
    const axes: [number, number, number, number][] = [
      [ox, dx, c.minX, c.maxX], [oy, dy, 0, c.height], [oz, dz, c.minZ, c.maxZ],
    ];
    let ok = true;
    for (const [o, d, mn, mx] of axes) {
      if (Math.abs(d) < 1e-8) { if (o < mn || o > mx) { ok = false; break; } continue; }
      let t1 = (mn - o) / d, t2 = (mx - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) { ok = false; break; }
    }
    if (ok && tmin < best) best = tmin;
  }
  return best;
}
