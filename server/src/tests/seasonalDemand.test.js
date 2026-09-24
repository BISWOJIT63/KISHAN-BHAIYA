import { describe, it, expect } from 'vitest';
import { models } from '../models/index.js';
import { seasonalDemand } from '../services/seasonalDemand.js';
import { scoreCandidates } from '../services/matching.js';
import { commodityName } from '../../../shared/produce.js';

describe('General produce and seasonal planning', () => {
  it('accepts the bulk form location as text in the database schema', async () => {
    const record = new models.BulkRequirement({ _id: 'test', location: 'Cuttack, Odisha', coordinates: [85.8, 20.4] });
    await expect(record.validate()).resolves.toBeUndefined();
    expect(record.location).toBe('Cuttack, Odisha');
  });
  it('matches general produce to a listed variety', () => {
    expect(commodityName('Jyoti Potato')).toBe('Potato');
    const candidates = scoreCandidates({ product: 'Potato', quantity: 10 }, [{ _id:'p1', name:'Jyoti Potato', sellerId:'seller-1', bulkPrice:20, availableQuantity:100 }], []);
    expect(candidates[0].productId).toBe('p1');
  });
  it('changes the crops for the upcoming season and festival without requiring listings', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const current = seasonalDemand({ now });
    const upcoming = seasonalDemand({ now, period:'upcoming' });
    expect(current.title).toContain('Monsoon');
    expect(upcoming.title).toContain('Winter');
    expect(upcoming.crops.some(c => c.crop === 'Cauliflower')).toBe(true);
    const festival = seasonalDemand({ now, period:'festival', festival:'Diwali' });
    expect(festival.crops.some(c => c.crop === 'Coconut')).toBe(true);
    expect(festival.crops.every(c => c.requirements === 0)).toBe(true);
  });
  it('counts only open, non-expired requirements using general crop names', () => {
    const result = seasonalDemand({ now:new Date('2026-09-24'), period:'festival', festival:'Diwali', requirements:[{ product:'Jyoti Potato', status:'OPEN', requiredDate:'2026-10-01' }, { product:'Potato', status:'FULFILLED' }, {product:'Potato',status:'OPEN',requiredDate:'2026-08-01'}] });
    expect(result.crops.find(c => c.crop === 'Potato').requirements).toBe(1);
  });
});
