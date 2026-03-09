const KM_TO_MI = 0.621371;

export function formatAltitude(
  altKm: number,
  units: "km" | "mi",
  decimals = 1
): string {
  if (units === "mi") {
    return `${(altKm * KM_TO_MI).toFixed(decimals)} mi`;
  }
  return `${altKm.toFixed(decimals)} km`;
}

export function formatVelocity(
  velKmS: number,
  units: "km" | "mi",
  decimals = 2
): string {
  if (units === "mi") {
    return `${(velKmS * KM_TO_MI).toFixed(decimals)} mi/s`;
  }
  return `${velKmS.toFixed(decimals)} km/s`;
}
