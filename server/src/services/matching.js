const weights = { landedPrice: .30, distance: .20, coverage: .20, reliability: .15, freshness: .10, quality: .05 };
const radians = (d) => d * Math.PI / 180;
export const distanceKm = (a, b) => {
  if (!a || !b) return 100;
  const [lon1,lat1] = a, [lon2,lat2] = b;
  const h = Math.sin(radians(lat2-lat1)/2)**2 + Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(radians(lon2-lon1)/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
};

export function scoreCandidates(requirement, products, lots) {
  const product=products.find((p)=>p._id===requirement.productId || p.name===requirement.product);
  if(!product) return [];
  const eligibleLots=lots.filter(l=>l.productId===product._id && !['EXPIRED','UNAVAILABLE'].includes(l.freshnessState));
  const groups=Object.values(eligibleLots.reduce((all,lot)=>{ all[lot.sellerId] ||= {sellerId:lot.sellerId,lots:[],availableQuantity:0,coordinates:lot.coordinates}; all[lot.sellerId].lots.push(lot);all[lot.sellerId].availableQuantity+=lot.availableQuantity;return all;},{}));
  if(!groups.length) groups.push({sellerId:product.sellerId,lots:[],availableQuantity:product.availableQuantity,coordinates:product.coordinates});
  return groups.map((group)=>{
    const seller=products.find(p=>p.sellerId===group.sellerId)?.seller || (group.sellerId===product.sellerId?product.seller:{id:group.sellerId,name:`Verified producer ${group.sellerId.slice(-1)}`,type:'Farmer',reliability:92,rating:4.6});
    const available = group.availableQuantity;
    const distance = distanceKm(group.coordinates, requirement.coordinates);
    const variation=(Number(group.sellerId.replace(/\D/g,''))||2)%4;
    const sellerPrice=Number((product.bulkPrice + (variation-1.5)*.35).toFixed(2));
    const landed = sellerPrice + distance * .025;
    const priceScore = Math.max(0, 1 - Math.abs(landed-(requirement.targetPrice||landed))/Math.max(landed,1));
    const coverage = Math.min(available/requirement.quantity,1);
    const reliability = (seller?.reliability || 90)/100;
    const freshest = group.lots[0]?.freshnessState;
    const freshness = freshest==='FRESH'?1:freshest==='SELL_SOON'?.72:.52;
    const quality = product.grade===requirement.quality?1:.65;
    const score = 100*(weights.landedPrice*priceScore+weights.distance*Math.max(0,1-distance/250)+weights.coverage*coverage+weights.reliability*reliability+weights.freshness*freshness+weights.quality*quality);
    return { sellerId:group.sellerId, seller, productId:product._id, availableQuantity:available, price:sellerPrice, distance:Number(distance.toFixed(1)), coveragePercent:Math.round(coverage*100), score:Math.round(score), explanation:`Covers ${Math.round(coverage*100)}% of requested quantity, is ${distance.toFixed(0)} km away, and has ${seller?.reliability || 90}% fulfillment reliability.` };
  }).sort((a,b)=>b.score-a.score);
}

export function buildFulfillmentPlan(requirement, candidates) {
  let remaining = requirement.quantity;
  const allocations = [];
  const eligibleCandidates = requirement.allowPartial === false
    ? candidates.filter((candidate) => candidate.availableQuantity >= requirement.quantity).slice(0, 1)
    : candidates;
  for (const candidate of eligibleCandidates) {
    if (remaining <= 0) break;
    const quantity = Math.min(remaining,candidate.availableQuantity);
    if (quantity > 0) allocations.push({
      ...candidate,
      quantity,
      allocationPercent: Math.round(quantity / requirement.quantity * 100),
      subtotal: Number((quantity*candidate.price).toFixed(2)),
      estimatedTransport: Math.round(candidate.distance * 8),
      splitReason: candidate.availableQuantity < requirement.quantity
        ? "Supplier capacity covers part of the requirement"
        : "Highest-ranked eligible supplier",
    });
    remaining -= quantity;
  }
  const filled = requirement.quantity - remaining;
  return {
    allocations,
    requestedQuantity:requirement.quantity,
    filledQuantity:filled,
    missingQuantity:remaining,
    coveragePercent:Math.round(filled/requirement.quantity*100),
    estimatedLandedTotal:Math.round(allocations.reduce((n,a)=>n+a.subtotal+a.estimatedTransport,0)),
    supplierCount: allocations.length,
    splitRequired: allocations.length > 1,
    method: requirement.allowPartial === false
      ? 'Single-supplier plan required by buyer · ranked for price, distance, reliability, freshness and quality'
      : 'Transparent capacity-aware supplier split · weighted for price, coverage, distance, reliability, freshness and quality',
  };
}

export { weights as matchingWeights };
