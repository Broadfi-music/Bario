// Retire the old music app-shell workers. Dedicated messaging workers are untouched.
export async function retireLegacyAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(registrations.filter(registration => {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      if (!worker) return false;
      return ["/sw.js", "/service-worker.js"].includes(new URL(worker.scriptURL).pathname);
    }).map(registration => registration.unregister()));
  } catch { /* Install metadata does not depend on service worker availability. */ }
}