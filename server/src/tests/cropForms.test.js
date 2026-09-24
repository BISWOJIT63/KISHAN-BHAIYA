import { beforeAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { store } from '../services/dataStore.js';
import { demoPassword } from '../seed/data.js';
const app = createApp();
beforeAll(async () => store.initialize('memory'));
const login = async identifier => (await request(app).post('/api/v1/auth/login').send({ identifier, password: demoPassword })).body.data.accessToken;
describe('General crop form submission', () => {
  it('posts a bulk request for a crop outside the fixed list', async () => {
    const token = await login('buyer@kishanbhaiya.demo');
    const response = await request(app).post('/api/v1/bulk-requirements').set('Authorization', `Bearer ${token}`).send({ product:'Dragon fruit', category:'Fruits', quantity:100, unit:'kg', quality:'A', requiredDate:'2027-01-01', location:'Cuttack, Odisha' });
    expect(response.status).toBe(200);
    expect(response.body.data.product).toBe('Dragon fruit');
    expect(response.body.data.location).toBe('Cuttack, Odisha');
  });
  it('posts and converts a custom farmer harvest without a hardcoded product ID', async () => {
    const token = await login('farmer@kishanbhaiya.demo');
    const response = await request(app).post('/api/v1/expected-harvests').set('Authorization', `Bearer ${token}`).send({ product:'Dragon fruit', expectedQuantity:100, expectedHarvestDate:'2027-01-01', grade:'A', minimumPrice:50, location:'Puri, Odisha' });
    expect(response.status).toBe(200);
    const converted = await request(app).post(`/api/v1/expected-harvests/${response.body.data._id}/convert`).set('Authorization', `Bearer ${token}`);
    expect(converted.status).toBe(200);
    expect(converted.body.data.productId).toBeTruthy();
    const product = await store.get('products', converted.body.data.productId);
    expect(product.name).toBe('Dragon fruit');
    expect(product.locationName).toBe('Puri, Odisha');
  });
  it('serves the seasonal page without requiring the AI provider', async () => {
    const response = await request(app).get('/api/v1/seasonal-demand?period=festival&festival=Diwali');
    expect(response.status).toBe(200);
    expect(response.body.data.crops.some(crop => crop.crop === 'Potato')).toBe(true);
    expect((await request(app).get('/api/v1/seasonal-demand?period=invalid')).status).toBe(400);
  });
});


it('lets pending applicants view public forecasts while keeping operations protected', async () => {
  const token = await login('pending.farmer@kishanbhaiya.demo');
  const response = await request(app).get('/api/v1/seasonal-demand').set('Authorization', 'Bearer '+token);
  expect(response.status).toBe(200);
  const forecast = await request(app).get('/api/v1/demand-forecast').set('Authorization', 'Bearer '+token);
  expect(forecast.status).toBe(200);
  expect(forecast.body.data.forecastType).toBe('historical');
  expect((await request(app).get('/api/v1/bulk-requirements').set('Authorization', 'Bearer '+token)).status).toBe(403);
});
