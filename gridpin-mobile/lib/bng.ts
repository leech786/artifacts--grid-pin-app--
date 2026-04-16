/**
 * British National Grid (OSGB36) to WGS84 lat/lon conversion.
 * Helmert 7-parameter transformation.
 */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function toRad(d: number) { return d * DEG; }
function toDeg(r: number) { return r * RAD; }

const a = 6_377_563.396;
const b = 6_356_256.909;
const e2 = (a * a - b * b) / (a * a);

const F0 = 0.9996012717;
const lat0 = toRad(49);
const lon0 = toRad(-2);
const N0 = -100_000;
const E0 = 400_000;

function n(airy: number, biry: number) {
  return (airy - biry) / (airy + biry);
}

function meridianArc(phi: number): number {
  const nv = n(a, b);
  const nv2 = nv * nv;
  const nv3 = nv2 * nv;
  return (
    b * F0 * (
      (1 + nv + (5 / 4) * nv2 + (5 / 4) * nv3) * (phi - lat0) -
      (3 * nv + 3 * nv2 + (21 / 8) * nv3) * Math.sin(phi - lat0) * Math.cos(phi + lat0) +
      ((15 / 8) * nv2 + (15 / 8) * nv3) * Math.sin(2 * (phi - lat0)) * Math.cos(2 * (phi + lat0)) -
      (35 / 24) * nv3 * Math.sin(3 * (phi - lat0)) * Math.cos(3 * (phi + lat0))
    )
  );
}

function osgb36ToLatLon(E: number, N: number): { phi: number; lam: number } {
  let phi = lat0 + (N - N0) / (a * F0);
  let M = meridianArc(phi);
  let prev: number;
  do {
    prev = phi;
    phi = prev + (N - N0 - M) / (a * F0);
    M = meridianArc(phi);
  } while (Math.abs(N - N0 - M) >= 0.001);

  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = Math.tan(phi);
  const nu = (a * F0) / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const rho = (a * F0 * (1 - e2)) / Math.pow(1 - e2 * sinPhi * sinPhi, 1.5);
  const eta2 = nu / rho - 1;

  const dE = E - E0;
  const dE2 = dE * dE;
  const dE3 = dE2 * dE;
  const dE4 = dE3 * dE;
  const dE5 = dE4 * dE;
  const dE6 = dE5 * dE;
  const dE7 = dE6 * dE;

  const VII = tanPhi / (2 * rho * nu);
  const VIII = (tanPhi / (24 * rho * Math.pow(nu, 3))) * (5 + 3 * tanPhi * tanPhi + eta2 - 9 * tanPhi * tanPhi * eta2);
  const IX = (tanPhi / (720 * rho * Math.pow(nu, 5))) * (61 + 90 * tanPhi * tanPhi + 45 * Math.pow(tanPhi, 4));
  const X = 1 / (cosPhi * nu);
  const XI = (1 / (cosPhi * 6 * Math.pow(nu, 3))) * (nu / rho + 2 * tanPhi * tanPhi);
  const XII = (1 / (cosPhi * 120 * Math.pow(nu, 5))) * (5 + 28 * tanPhi * tanPhi + 24 * Math.pow(tanPhi, 4));
  const XIIA = (1 / (cosPhi * 5040 * Math.pow(nu, 7))) * (61 + 662 * tanPhi * tanPhi + 1320 * Math.pow(tanPhi, 4) + 720 * Math.pow(tanPhi, 6));

  const latRad = phi - VII * dE2 + VIII * dE4 - IX * dE6;
  const lonRad = lon0 + X * dE - XI * dE3 + XII * dE5 - XIIA * dE7;

  return { phi: latRad, lam: lonRad };
}

function helmertOsgb36ToWgs84(x: number, y: number, z: number) {
  const tx = 446.448, ty = -125.157, tz = 542.06;
  const rx = toRad(0.1502 / 3600);
  const ry = toRad(0.247 / 3600);
  const rz = toRad(0.8421 / 3600);
  const s = 1 + 20.4894e-6;
  return {
    x: tx + s * (x - rz * y + ry * z),
    y: ty + s * (rz * x + y - rx * z),
    z: tz + s * (-ry * x + rx * y + z),
  };
}

const aW = 6_378_137.0;
const bW = 6_356_752.3141;
const e2W = (aW * aW - bW * bW) / (aW * aW);

function cartesianToLatLon(x: number, y: number, z: number): { lat: number; lon: number } {
  const lon = Math.atan2(y, x);
  const p = Math.sqrt(x * x + y * y);
  let lat = Math.atan2(z, p * (1 - e2W));
  let latPrev: number;
  do {
    latPrev = lat;
    const nu = aW / Math.sqrt(1 - e2W * Math.sin(lat) * Math.sin(lat));
    lat = Math.atan2(z + e2W * nu * Math.sin(lat), p);
  } while (Math.abs(lat - latPrev) > 1e-12);
  return { lat: toDeg(lat), lon: toDeg(lon) };
}

export function bngToLatLon(easting: number, northing: number): { lat: number; lon: number } {
  const { phi, lam } = osgb36ToLatLon(easting, northing);
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const nuA = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const xA = nuA * cosPhi * Math.cos(lam);
  const yA = nuA * cosPhi * Math.sin(lam);
  const zA = (nuA * (1 - e2)) * sinPhi;
  const { x: xB, y: yB, z: zB } = helmertOsgb36ToWgs84(xA, yA, zA);
  return cartesianToLatLon(xB, yB, zB);
}

export function toDMS(decimal: number, dirs: [string, string]): string {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(2);
  const dir = decimal >= 0 ? dirs[0] : dirs[1];
  return `${deg}° ${min}' ${sec}" ${dir}`;
}
