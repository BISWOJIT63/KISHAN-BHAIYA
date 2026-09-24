import { commodityName } from '../../../shared/produce.js';

// Planning scenarios, not measured demand or an authoritative crop calendar.
const seasons = [
  { name: 'Winter', months: [11, 12, 1, 2], crops: ['Cauliflower', 'Cabbage', 'Carrot', 'Peas', 'Spinach', 'Orange'] },
  { name: 'Summer', months: [3, 4, 5, 6], crops: ['Watermelon', 'Mango', 'Cucumber', 'Lemon', 'Papaya', 'Okra'] },
  { name: 'Monsoon / autumn', months: [7, 8, 9, 10], crops: ['Pumpkin', 'Brinjal', 'Okra', 'Banana', 'Guava', 'Beans'] },
];
export const festivalScenarios = {
  'Durga Puja / Dussehra': ['Banana', 'Coconut', 'Apple', 'Pumpkin', 'Potato', 'Tomato'],
  'Diwali': ['Banana', 'Coconut', 'Apple', 'Potato', 'Tomato', 'Peas'],
  'Rath Yatra': ['Coconut', 'Banana', 'Pumpkin', 'Potato', 'Brinjal', 'Lemon'],
  'Makar Sankranti': ['Coconut', 'Banana', 'Carrot', 'Peas', 'Cauliflower', 'Orange'],
};
export function seasonalDemand({ requirements = [], now = new Date(), period = 'current', festival = 'Durga Puja / Dussehra' } = {}) {
  const month = Number(new Intl.DateTimeFormat('en', { month: 'numeric', timeZone: 'Asia/Kolkata' }).format(now));
  const index = seasons.findIndex(season => season.months.includes(month));
  const season = seasons[(index + (period === 'upcoming' ? 1 : 0)) % seasons.length];
  const crops = period === 'festival' ? festivalScenarios[festival] || [] : season.crops;
  const active = requirements.filter(r => ['OPEN', 'QUOTES_RECEIVED', 'NEGOTIATING'].includes(r.status) && (!r.requiredDate || new Date(r.requiredDate) >= now));
  return {
    title: period === 'festival' ? `${festival} planning scenario` : `${period === 'upcoming' ? 'Upcoming' : 'Current'} season: ${season.name}`,
    festivals: Object.keys(festivalScenarios),
    basis: 'Illustrative seasonal and festival assumptions for Odisha. These are planning suggestions, not a trained statistical forecast. Festival dates are not inferred; choose the event you are preparing for. Local demand and growing conditions may differ.',
    crops: crops.map(crop => {
      const matches = active.filter(r => commodityName(r.product).toLowerCase() === crop.toLowerCase());
      return { crop, requirements: matches.length, reason: period === 'festival' ? `Consider ${crop.toLowerCase()} for festival sourcing; confirm requirements with buyers before committing supply.` : `Consider ${crop.toLowerCase()} in your ${season.name.toLowerCase()} sourcing plan; confirm local harvest availability and buyer interest.`, outlook: matches.length ? 'Buyer interest recorded' : 'Planning opportunity' };
    }).sort((a, b) => b.requirements - a.requirements),
  };
}
