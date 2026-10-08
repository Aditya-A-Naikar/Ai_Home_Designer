/**
 * Solar Study & Daylighting Engine
 * Computes physically accurate sun azimuth, altitude, color temperature,
 * and 3D directional light vectors for True-North daylight simulation.
 */

export type Season = "summer_solstice" | "equinox" | "winter_solstice";

export interface SolarCalculationInput {
  timeHours: number; // 0 to 24 (e.g. 9.5 = 9:30 AM)
  season: Season;
  latitudeDeg?: number; // default 28.6 (New Delhi / Austin latitude band)
  northAngleDeg?: number; // 0 = North up, 90 = East, 180 = South, 270 = West
}

export interface SolarCalculationResult {
  altitudeDeg: number; // Solar elevation angle above horizon (0 to 90)
  azimuthDeg: number; // Solar compass bearing from True North (0 to 360)
  relativeAzimuthDeg: number; // Azimuth rotated relative to project's north orientation
  sunPosition: { x: number; y: number; z: number }; // 3D unit/scaled vector for Three.js
  lightIntensity: number; // Directional sunlight intensity
  ambientIntensity: number; // Indirect sky ambient intensity
  colorHex: string; // Sunlight color tint based on atmosphere scattering
  timeFormatted: string; // e.g. "09:30 AM"
  isDaylight: boolean;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculates solar position and lighting parameters.
 */
export function calculateSolarPosition(input: SolarCalculationInput): SolarCalculationResult {
  const {
    timeHours,
    season,
    latitudeDeg = 28.6,
    northAngleDeg = 0,
  } = input;

  // 1. Solar declination angle based on season
  let declinationDeg = 0; // Equinox
  if (season === "summer_solstice") {
    declinationDeg = 23.44;
  } else if (season === "winter_solstice") {
    declinationDeg = -23.44;
  }

  // 2. Solar Hour Angle (H): 15 degrees per hour from solar noon (12:00)
  const hourAngleDeg = (timeHours - 12) * 15;

  const latRad = latitudeDeg * DEG_TO_RAD;
  const decRad = declinationDeg * DEG_TO_RAD;
  const hourRad = hourAngleDeg * DEG_TO_RAD;

  // 3. Solar Altitude Angle (alpha)
  // sin(alpha) = sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H)
  const sinAltitude = Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad);
  
  const altitudeRad = Math.asin(Math.max(-1, Math.min(1, sinAltitude)));
  const altitudeDeg = altitudeRad * RAD_TO_DEG;

  // 4. Solar Azimuth Angle (psi)
  let azimuthDeg = 180;
  if (altitudeDeg > 0.1) {
    const cosAzimuth = (Math.sin(decRad) - Math.sin(altitudeRad) * Math.sin(latRad)) /
      (Math.cos(altitudeRad) * Math.cos(latRad));
    const clampedCos = Math.max(-1, Math.min(1, cosAzimuth));
    let psi = Math.acos(clampedCos) * RAD_TO_DEG;

    // Morning: Sun is in East (Azimuth < 180); Afternoon: Sun is in West (Azimuth > 180)
    if (hourAngleDeg > 0) {
      psi = 360 - psi;
    }
    azimuthDeg = psi;
  } else {
    // Night
    azimuthDeg = hourAngleDeg < 0 ? 90 : 270;
  }

  // 5. Relative Azimuth relative to project's True-North alignment
  const relativeAzimuthDeg = (azimuthDeg - northAngleDeg + 360) % 360;
  const relAzRad = relativeAzimuthDeg * DEG_TO_RAD;

  // 6. 3D Sun Position Vector (for Three.js scene distance ~45m)
  const radius = 45;
  const isDaylight = altitudeDeg > 0;
  const safeAltitudeRad = Math.max(0.05, altitudeRad);

  // In Three.js: +Y is Up, +X is East/Right, +Z is South/Forward (Z = -cos, X = sin)
  const sunX = radius * Math.cos(safeAltitudeRad) * Math.sin(relAzRad);
  const sunY = radius * Math.sin(safeAltitudeRad);
  const sunZ = -radius * Math.cos(safeAltitudeRad) * Math.cos(relAzRad);

  // 7. Light Intensity & Color Temperature
  let lightIntensity = 0;
  let ambientIntensity = 0.2;
  let colorHex = "#ffffff";

  if (!isDaylight) {
    lightIntensity = 0.05;
    ambientIntensity = 0.15;
    colorHex = "#94a3b8"; // Twilight slate
  } else if (altitudeDeg < 12) {
    // Golden Hour (Low sun angle: long warm shadows)
    lightIntensity = 0.85;
    ambientIntensity = 0.4;
    colorHex = "#fbbf24"; // Amber gold
  } else if (altitudeDeg < 35) {
    // Morning / Mid-Afternoon
    lightIntensity = 1.15;
    ambientIntensity = 0.55;
    colorHex = "#fef08a"; // Warm sun yellow
  } else {
    // High Noon / Midday
    lightIntensity = 1.35;
    ambientIntensity = 0.65;
    colorHex = "#ffffff"; // Crisp white daylight
  }

  // 8. Formatted Time String
  const hours = Math.floor(timeHours);
  const minutes = Math.round((timeHours - hours) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const timeFormatted = `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;

  return {
    altitudeDeg: Math.max(0, Number(altitudeDeg.toFixed(1))),
    azimuthDeg: Number(azimuthDeg.toFixed(1)),
    relativeAzimuthDeg: Number(relativeAzimuthDeg.toFixed(1)),
    sunPosition: {
      x: Number(sunX.toFixed(2)),
      y: Number(sunY.toFixed(2)),
      z: Number(sunZ.toFixed(2)),
    },
    lightIntensity: Number(lightIntensity.toFixed(2)),
    ambientIntensity: Number(ambientIntensity.toFixed(2)),
    colorHex,
    timeFormatted,
    isDaylight,
  };
}
