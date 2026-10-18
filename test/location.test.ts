import { it, expect, vi, afterEach } from "vitest";
vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: vi.fn(),
  getCurrentPositionAsync: vi.fn(),
  geocodeAsync: vi.fn(),
  Accuracy: { High: 4 },
}));
import * as Location from "expo-location";
import { currentPosition, searchAddress } from "../apps/mobile/location";
afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});
it("denied permission never starts position capture", async () => {
  vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
    status: "denied",
  } as any);
  await expect(currentPosition()).rejects.toThrow(/permission was denied/);
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});
it("imprecise location cannot silently become a delivery point", async () => {
  vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
    status: "granted",
  } as any);
  vi.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 28, longitude: 77, accuracy: 2000 },
  } as any);
  await expect(currentPosition()).rejects.toThrow(/too approximate/);
});
it("GPS timeout returns control to the user", async () => {
  vi.useFakeTimers();
  vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
    status: "granted",
  } as any);
  vi.mocked(Location.getCurrentPositionAsync).mockImplementation(
    () => new Promise(() => {}),
  );
  const result = expect(currentPosition()).rejects.toThrow(/too long/);
  await vi.advanceTimersByTimeAsync(25000);
  await result;
});
it("geocoding no matches never invents a coordinate", async () => {
  vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
    status: "granted",
  } as any);
  vi.mocked(Location.geocodeAsync).mockResolvedValue([]);
  await expect(searchAddress("Fixture office, Gurugram")).rejects.toThrow(
    /No location found/,
  );
});
