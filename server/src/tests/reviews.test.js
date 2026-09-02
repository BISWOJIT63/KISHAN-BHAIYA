import {beforeAll,describe,expect,it} from 'vitest';
import request from 'supertest';
import {createApp} from '../app.js';
import {store} from '../services/dataStore.js';
import {demoPassword} from '../seed/data.js';

const app=createApp();
const login=async(identifier)=>{
  const response=await request(app).post('/api/v1/auth/login').send({identifier,password:demoPassword});
  expect(response.status).toBe(200);
  return response.body.data.accessToken;
};
const auth=(token)=>({Authorization:`Bearer ${token}`});

let buyerToken,fleetToken;
beforeAll(async()=>{
  await store.initialize('memory');
  buyerToken=await login('consumer@kishanbhaiya.demo');
  fleetToken=await login('fleet@kishanbhaiya.demo');
});

describe('platform feedback',()=>{
  it('accepts a star-only rating and rejects an out-of-range one',async()=>{
    const created=await request(app).post('/api/v1/platform-feedback').set(auth(buyerToken)).send({rating:5,orderId:'order-KB260821'});
    expect(created.status).toBe(200);
    expect(created.body.data.rating).toBe(5);
    expect(created.body.data.role).toBe('consumer');
    // A rating alone must be enough — requiring text would exclude low-literacy users.
    expect(created.body.data.comment).toBe('');
    const invalid=await request(app).post('/api/v1/platform-feedback').set(auth(buyerToken)).send({rating:9});
    expect(invalid.status).toBe(400);
  });
  it('is not readable by the buyer who wrote it',async()=>{
    const response=await request(app).get('/api/v1/platform-feedback').set(auth(buyerToken));
    expect(response.status).toBe(403);
  });
});

describe('order reviews',()=>{
  it('refuses a review until the order is delivered',async()=>{
    const eligibility=await request(app).get('/api/v1/orders/order-KB260821/review-eligibility').set(auth(buyerToken));
    expect(eligibility.status).toBe(200);
    expect(eligibility.body.data.delivered).toBe(false);
    expect(eligibility.body.data.reviewable).toBe(false);
    const blocked=await request(app).post('/api/v1/orders/order-KB260821/reviews').set(auth(buyerToken)).send({rating:5});
    expect(blocked.status).toBe(409);
  });

  it('lists the sellers and items a delivered order may rate',async()=>{
    const response=await request(app).get('/api/v1/orders/order-KB260814/review-eligibility').set(auth(buyerToken));
    expect(response.status).toBe(200);
    expect(response.body.data.reviewable).toBe(true);
    expect(response.body.data.sellers.length).toBeGreaterThan(0);
    expect(response.body.data.items.map((item)=>item.productId)).toContain('prod-mango');
  });

  it('moves the seller and product averages, then blocks a second submission',async()=>{
    const before=await request(app).get('/api/v1/products/prod-mango');
    const beforeReviews=before.body.data.reviews;
    const submitted=await request(app).post('/api/v1/orders/order-KB260814/reviews').set(auth(buyerToken)).send({
      rating:4,comment:'Reached us fresh, packed well.',tags:['FRESH','ON_TIME'],
      productRatings:[{productId:'prod-mango',rating:5,comment:'Very sweet'},{productId:'prod-not-in-order',rating:1}],
    });
    expect(submitted.status).toBe(200);
    // The product that was not part of the order must be dropped silently.
    expect(submitted.body.data.reviews.some((review)=>review.productId==='prod-not-in-order')).toBe(false);
    expect(submitted.body.data.reviews.some((review)=>review.productId==='prod-mango')).toBe(true);

    const productReviews=await request(app).get('/api/v1/products/prod-mango/reviews');
    expect(productReviews.status).toBe(200);
    expect(productReviews.body.data.summary.count).toBe(1);
    expect(productReviews.body.data.summary.average).toBe(5);
    expect(productReviews.body.data.reviews[0].verifiedPurchase).toBe(true);

    const after=await request(app).get('/api/v1/products/prod-mango');
    // Seeded counts are kept as a baseline so a real review nudges rather than resets.
    expect(after.body.data.reviews).toBe(beforeReviews+1);
    expect(after.body.data.rating).toBeGreaterThan(0);

    const sellerId=(await request(app).get('/api/v1/orders/order-KB260814/review-eligibility').set(auth(buyerToken))).body.data.sellers[0].sellerId;
    const sellerReviews=await request(app).get(`/api/v1/sellers/${sellerId}/reviews`);
    expect(sellerReviews.status).toBe(200);
    expect(sellerReviews.body.data.summary.count).toBe(1);
    // Per-product ratings must not double-count against the seller score.
    expect(sellerReviews.body.data.reviews.every((review)=>!review.productId)).toBe(true);

    const repeat=await request(app).post('/api/v1/orders/order-KB260814/reviews').set(auth(buyerToken)).send({rating:1});
    expect(repeat.status).toBe(409);
    const eligibility=await request(app).get('/api/v1/orders/order-KB260814/review-eligibility').set(auth(buyerToken));
    expect(eligibility.body.data.alreadyReviewed).toBe(true);
    expect(eligibility.body.data.reviewable).toBe(false);
  });

  it('keeps one buyer out of another buyer\'s order',async()=>{
    const businessToken=await login('buyer@kishanbhaiya.demo');
    const response=await request(app).get('/api/v1/orders/order-KB260805/review-eligibility').set(auth(businessToken));
    expect(response.status).toBe(403);
  });
});

describe('delivery propagation',()=>{
  it('flips the order to DELIVERED and notifies the buyer when the fleet partner files proof',async()=>{
    const shipment=await store.get('shipments','ship-fleet-demo');
    const orderId=shipment.orderIds[0];
    await store.create('orders',{_id:orderId,buyerId:'user-consumer',type:'RETAIL',status:'IN_TRANSIT',total:900,
      items:[{productId:'prod-banana',name:'Champa Banana',quantity:10,price:42}],shipmentId:shipment._id},'order');

    const delivered=await request(app).post(`/api/v1/shipments/${shipment._id}/proof-of-delivery`).set(auth(fleetToken))
      .send({receiverName:'Rekha Das',acceptedQuantity:10});
    expect(delivered.status).toBe(200);
    expect(delivered.body.data.status).toBe('DELIVERED');

    const order=await store.get('orders',orderId);
    expect(order.status).toBe('DELIVERED');
    expect(order.deliveredAt).toBeTruthy();

    const notifications=await request(app).get('/api/v1/notifications').set(auth(buyerToken));
    const delivery=notifications.body.data.find((note)=>note.type==='ORDER_DELIVERED'&&note.entityId===orderId);
    expect(delivery).toBeTruthy();
    expect(delivery.actionPath).toBe(`/orders/${orderId}/review`);

    // The delivery gate is now open for that order.
    const eligibility=await request(app).get(`/api/v1/orders/${orderId}/review-eligibility`).set(auth(buyerToken));
    expect(eligibility.body.data.reviewable).toBe(true);
  });
});
