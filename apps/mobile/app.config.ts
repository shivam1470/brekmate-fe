import type { ExpoConfig, ConfigContext } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = process.env.APP_VARIANT ?? "development";
  if (!["development", "staging", "production"].includes(variant))
    throw new Error("Unknown APP_VARIANT");
  if (variant !== "development") {
    for (const name of [
      "EXPO_PUBLIC_API_ORIGIN",
      "EXPO_PUBLIC_CUSTOMER_POOL_ID",
      "EXPO_PUBLIC_CUSTOMER_CLIENT_ID",
    ])
      if (!process.env[name])
        throw new Error(`Missing ${name} for ${variant} build`);
    if (!process.env.EXPO_PUBLIC_API_ORIGIN?.startsWith("https://"))
      throw new Error("Cloud builds require an HTTPS API origin");
  }
  const suffix =
    variant === "production" ? "" : variant === "staging" ? ".staging" : ".dev";
  return {
    ...config,
    name: variant === "production" ? "BrekMate" : `BrekMate ${variant}`,
    slug: "brekmate",
    version: "0.1.0",
    ios: { ...config.ios, bundleIdentifier: `com.brekmate.customer${suffix}` },
    android: { ...config.android, package: `com.brekmate.customer${suffix}` },
    extra: { ...config.extra, appVariant: variant },
  };
};
