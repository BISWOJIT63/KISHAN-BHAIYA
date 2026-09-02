import { store } from "./dataStore.js";
import { optimizeRoute } from "./routeOptimizer.js";
import { enrichRouteWithOsrm } from "./osrm.js";

/**
 * Builds and persists the best available route for a shipment.
 *
 * Keeping this workflow in a service lets store checkout, fleet dispatch and
 * driver actions share one implementation instead of embedding route logic in
 * the API registration file.
 */
export async function optimizeStoredShipment(
  shipment,
  trigger,
  session = null,
) {
  const localRoute = optimizeRoute(
    shipment.stops,
    {
      capacity: shipment.capacity,
      load: shipment.load,
      coldChain: shipment.coldChain,
    },
    { trigger, coldChainRequired: shipment.coldChainRequired },
  );
  const route = await enrichRouteWithOsrm(localRoute);

  return store.update(
    "shipments",
    shipment._id,
    {
      ...route,
      autoOptimized: true,
      lastOptimizedAt: route.routeOptimization.optimizedAt,
    },
    session,
  );
}
