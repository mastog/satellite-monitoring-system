/**
 * Loads the Ammo.js Bullet Physics runtime into the browser and exposes it on
 * `window.Ammo`, which is the location expected by the vendored MMD physics code.
 */

let loading: Promise<void> | null = null;

// Loads the script only once and reuses the same promise for all callers.
export function loadAmmo(): Promise<void> {
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Ammo) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "/libs/ammo.wasm.js";
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AmmoFactory = (window as any).Ammo;
      if (typeof AmmoFactory === "function") {
        // Invokes the Ammo factory so the WASM module is initialized before resolving.
        AmmoFactory({
          locateFile: () => "/libs/ammo.wasm.wasm",
        })
          .then((ammo: unknown) => {
            // Replaces the factory function with the fully initialized Ammo module.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).Ammo = ammo;
            resolve();
          })
          .catch(reject);
      } else {
        // Treats non-function Ammo as an already initialized runtime.
        resolve();
      }
    };
    script.onerror = () => reject(new Error("Failed to load ammo.wasm.js"));
    document.head.appendChild(script);
  });

  return loading;
}
