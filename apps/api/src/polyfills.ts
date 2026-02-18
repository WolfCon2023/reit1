import { webcrypto } from "node:crypto";

// otplib requires globalThis.crypto.getRandomValues (Web Crypto API).
// Node 18 doesn't always expose it globally, especially in container runtimes.
if (typeof globalThis.crypto === "undefined") {
  (globalThis as Record<string, unknown>).crypto = webcrypto as unknown as Crypto;
} else if (typeof globalThis.crypto.getRandomValues !== "function") {
  globalThis.crypto.getRandomValues = webcrypto.getRandomValues.bind(
    webcrypto,
  ) as typeof globalThis.crypto.getRandomValues;
}
