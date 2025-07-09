// coordsys.js
// Coordinate system conversion utilities for WGS84, PSD93 (EPSG:4134), and PSD93 UTM zones

// Helmert transformation parameters from WGS84 to PSD93 (EPSG:1439)
// Source: https://epsg.io/1439
// WGS84 -> PSD93
const helmertParams = {
  dx: -180.624, // meters
  dy: -225.516,
  dz: 173.919,
  rx: -0.81, // arc-seconds
  ry: -1.898,
  rz: 8.336,
  scale: 16.71006, // ppm
};

// Convert degrees to radians
function deg2rad(deg) {
  return (deg * Math.PI) / 180;
}
// Convert radians to degrees
function rad2deg(rad) {
  return (rad * 180) / Math.PI;
}

// Convert arc-seconds to radians
function arcsec2rad(sec) {
  return (sec * (Math.PI / 180)) / 3600;
}

// Convert geodetic to cartesian (ECEF)
function geodeticToECEF(lat, lon, h, a, f) {
  lat = deg2rad(lat);
  lon = deg2rad(lon);
  const e2 = 2 * f - f * f;
  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
  const X = (N + h) * Math.cos(lat) * Math.cos(lon);
  const Y = (N + h) * Math.cos(lat) * Math.sin(lon);
  const Z = (N * (1 - e2) + h) * Math.sin(lat);
  return [X, Y, Z];
}

// Convert cartesian (ECEF) to geodetic
function ecefToGeodetic(X, Y, Z, a, f) {
  // Iterative Bowring's method
  const e2 = 2 * f - f * f;
  const ep2 = e2 / (1 - e2);
  const p = Math.sqrt(X * X + Y * Y);
  const theta = Math.atan2(Z * a, p * (1 - f) * a);
  const lon = Math.atan2(Y, X);
  let lat = Math.atan2(
    Z + ep2 * (1 - f) * a * Math.pow(Math.sin(theta), 3),
    p - e2 * a * Math.pow(Math.cos(theta), 3)
  );
  let N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
  let h = p / Math.cos(lat) - N;
  lat = rad2deg(lat);
  return [lat, rad2deg(lon), h];
}

// Apply full Helmert transformation (WGS84 -> PSD93) using Position Vector convention (EPSG:9606)
function wgs84ToPSD93(lat, lon, h = 0) {
  // WGS84 ellipsoid
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  let [Xs, Ys, Zs] = geodeticToECEF(lat, lon, h, a, f);
  // 7-parameter transformation
  const s = helmertParams.scale * 1e-6; // scale in ppm
  const rx = arcsec2rad(helmertParams.rx);
  const ry = arcsec2rad(helmertParams.ry);
  const rz = arcsec2rad(helmertParams.rz);
  const tX = helmertParams.dx;
  const tY = helmertParams.dy;
  const tZ = helmertParams.dz;
  // Position Vector convention (EPSG:9606)
  const Xt = Xs + tX + s * Xs - rz * Ys + ry * Zs;
  const Yt = Ys + tY + rz * Xs + s * Ys - rx * Zs;
  const Zt = Zs + tZ - ry * Xs + rx * Ys + s * Zs;
  // PSD93 ellipsoid (Clarke 1880)
  const a_psd = 6378249.145;
  const f_psd = 1 / 293.465;
  return ecefToGeodetic(Xt, Yt, Zt, a_psd, f_psd);
}

// Apply inverse Helmert transformation (PSD93 -> WGS84) using Position Vector convention (EPSG:9606)
function psd93ToWGS84(lat, lon, h = 0) {
  // PSD93 ellipsoid (Clarke 1880)
  const a_psd = 6378249.145;
  const f_psd = 1 / 293.465;
  let [Xt, Yt, Zt] = geodeticToECEF(lat, lon, h, a_psd, f_psd);
  // Inverse 7-parameter transformation
  const s = -helmertParams.scale * 1e-6; // negative for inverse
  const rx = -arcsec2rad(helmertParams.rx);
  const ry = -arcsec2rad(helmertParams.ry);
  const rz = -arcsec2rad(helmertParams.rz);
  const tX = -helmertParams.dx;
  const tY = -helmertParams.dy;
  const tZ = -helmertParams.dz;
  // Position Vector convention (EPSG:9606)
  const Xs = Xt + tX + s * Xt - rz * Yt + ry * Zt;
  const Ys = Yt + tY + rz * Xt + s * Yt - rx * Zt;
  const Zs = Zt + tZ - ry * Xt + rx * Yt + s * Zt;
  // WGS84 ellipsoid
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  return ecefToGeodetic(Xs, Ys, Zs, a, f);
}

// UTM projection for PSD93 (Clarke 1880, zones 39N and 40N)
function psd93ToUTM(lat, lon, zone) {
  // Clarke 1880 (RGS)
  const a = 6378249.145;
  const f = 1 / 293.465;
  const k0 = 0.9996;
  const e2 = 2 * f - f * f;
  const e = Math.sqrt(e2);
  const latRad = deg2rad(lat);
  const lonRad = deg2rad(lon);
  const zoneCM = 6 * zone - 183;
  const lon0 = deg2rad(zoneCM);
  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) * Math.sin(latRad));
  const T = Math.tan(latRad) * Math.tan(latRad);
  const C = (e2 / (1 - e2)) * Math.cos(latRad) * Math.cos(latRad);
  const A = Math.cos(latRad) * (lonRad - lon0);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latRad -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(2 * latRad) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) *
        Math.sin(4 * latRad) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * latRad));
  const easting =
    500000 +
    k0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - (58 * e2) / (1 - e2)) *
          Math.pow(A, 5)) /
          120);
  const northing =
    k0 *
    (M +
      N *
        Math.tan(latRad) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - (330 * e2) / (1 - e2)) *
            Math.pow(A, 6)) /
            720));
  return { easting, northing, zone };
}

function utmToPSD93(easting, northing, zone) {
  // Clarke 1880 (RGS)
  const a = 6378249.145;
  const f = 1 / 293.465;
  const k0 = 0.9996;
  const e2 = 2 * f - f * f;
  const e = Math.sqrt(e2);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const zoneCM = 6 * zone - 183;
  const lon0 = deg2rad(zoneCM);
  const x = easting - 500000;
  const y = northing;
  const M = y / k0;
  const mu =
    M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
  let phi1 =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const C1 = (e2 / (1 - e2)) * Math.cos(phi1) * Math.cos(phi1);
  const R1 =
    (a * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const D = x / (N1 * k0);
  const lat = rad2deg(
    phi1 -
      ((N1 * Math.tan(phi1)) / R1) *
        ((D * D) / 2 -
          ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - (9 * e2) / (1 - e2)) *
            Math.pow(D, 4)) /
            24 +
          ((61 +
            90 * T1 +
            298 * C1 +
            45 * T1 * T1 -
            (252 * e2) / (1 - e2) -
            3 * C1 * C1) *
            Math.pow(D, 6)) /
            720)
  );
  const lon = rad2deg(
    lon0 +
      (D -
        ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
        ((5 -
          2 * C1 +
          28 * T1 -
          3 * C1 * C1 +
          (8 * e2) / (1 - e2) +
          24 * T1 * T1) *
          Math.pow(D, 5)) /
          120) /
        Math.cos(phi1)
  );
  return { lat, lon };
}

// Export functions for use in main script
window.coordSys = {
  wgs84ToPSD93,
  psd93ToWGS84,
  psd93ToUTM,
  utmToPSD93,
};
