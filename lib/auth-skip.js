export function isAuthSkipEnabled() {
  return (
    process.env.ENABLE_AUTH_SKIP === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
