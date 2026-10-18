import * as Location from "expo-location";
async function permission() {
  if ((await Location.requestForegroundPermissionsAsync()).status !== "granted")
    throw new Error(
      "Location permission was denied. Use manual map coordinates instead.",
    );
}
async function bounded<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                "Location took too long. Try again or use manual map coordinates.",
              ),
            ),
          25000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function currentPosition() {
  await permission();
  const p = await bounded(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
  );
  if (p.coords.accuracy !== null && p.coords.accuracy > 200)
    throw new Error("Location is too approximate. Use a precise map location.");
  return { latitude: p.coords.latitude, longitude: p.coords.longitude };
}
export async function searchAddress(address: string) {
  if (address.trim().length < 8)
    throw new Error("Enter building, street and city before searching.");
  await permission();
  const results = await bounded(Location.geocodeAsync(address.trim()));
  if (!results.length)
    throw new Error(
      "No location found. Use current location or manual map coordinates.",
    );
  return results
    .slice(0, 5)
    .map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
}
