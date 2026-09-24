import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { roadRoute } from '../services/roadRoute.js';
import { createApp } from '../app.js';
import { store } from '../services/dataStore.js';
import { demoPassword } from '../seed/data.js';
import { optimizeRoute } from '../services/routeOptimizer.js';
beforeAll(async () => store.initialize('memory'));
describe('Road geometry and admin reviews', () => {
  it('requests full GeoJSON road geometry and caches a successful route', async () => {
    const points = [[85.82,20.29],[85.88,20.46]];
    const fetchImpl = vi.fn(async () => ({ ok:true, json:async () => ({code:'Ok',routes:[{distance:23000,duration:1800,geometry:{type:'LineString',coordinates:[points[0],[85.84,20.35],points[1]]}}]}) }));
    const route = await roadRoute(points, fetchImpl);
    expect(fetchImpl.mock.calls[0][0]).toContain('overview=full&geometries=geojson');
    expect(route.geometry.coordinates).toHaveLength(3);
    expect(route.distance).toBe(23);
    await roadRoute(points, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('does not return a fabricated route on provider failure or invalid coordinates', async () => {
    await expect(roadRoute([[85,20],[86,21]], async () => ({ok:false}))).rejects.toThrow('unavailable');
    await expect(roadRoute([[200,20],[86,21]])).rejects.toThrow('valid');
  });
  it('preserves completed stops and pickup-before-delivery constraints', () => {
    const stops = [{type:'PICKUP',status:'COMPLETED',coordinates:[85,20]},{type:'DELIVERY',coordinates:[86,21]},{type:'PICKUP',coordinates:[85.2,20.1]},{type:'HUB',coordinates:[85.5,20.5]}];
    const route = optimizeRoute(stops);
    expect(route.stops.map(s => s.type)).toEqual(['PICKUP','PICKUP','HUB','DELIVERY']);
    expect(route.stops[0].status).toBe('COMPLETED');
    expect(route.stops.filter(s => s.status === 'NEXT')).toHaveLength(1);
  });
  it('persists admin rejection and approval and returns fresh status to the applicant', async () => {
    const app = createApp();
    const login = async identifier => (await request(app).post('/api/v1/auth/login').send({identifier,password:demoPassword})).body.data.accessToken;
    const admin = await login('admin@kishanbhaiya.demo');
    const farmer = await login('pending.farmer@kishanbhaiya.demo');
    const before = await request(app).get('/api/v1/auth/verification').set('Authorization',`Bearer ${farmer}`);
    const id = before.body.data.profile._id;
    const review = body => request(app).patch(`/api/v1/admin/verifications/${id}/review`).set('Authorization',`Bearer ${admin}`).send(body);
    expect((await review({action:'REJECT',note:' ',reasonCode:'DOCUMENT_MISMATCH'})).status).toBe(400);
    expect((await review({action:'REJECT',note:'Document details do not match',reasonCode:'DOCUMENT_MISMATCH'})).body.data.overallStatus).toBe('REJECTED');
    const rejected = await request(app).get('/api/v1/auth/verification').set('Authorization',`Bearer ${farmer}`);
    expect(rejected.body.data.user.accountStatus).toBe('REJECTED');
    expect((await review({action:'APPROVE'})).body.data.overallStatus).toBe('APPROVED');
    const approved = await request(app).get('/api/v1/auth/verification').set('Authorization',`Bearer ${farmer}`);
    expect(approved.body.data.user.accountStatus).toBe('ACTIVE');
  });
});
