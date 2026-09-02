const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82`;
const coords = {
  bhubaneswar: [85.8245, 20.2961], cuttack: [85.883, 20.4625], puri: [85.8315, 19.8135],
  khordha: [85.6156, 20.182], balasore: [86.9335, 21.4934], sambalpur: [83.9701, 21.4669], nayagarh: [85.0985, 20.1289]
};

export const demoPassword = 'KishanBhaiya@2026';

export const buildSeedData = () => {
  const now = new Date('2026-08-23T06:00:00.000Z');
  const days = (n) => new Date(now.getTime() + n * 86400000).toISOString();
  const users = [
    { _id: 'user-consumer', name: 'Ananya Das', email: 'consumer@kishanbhaiya.demo', phone: '9876501001', role: 'consumer', location: 'Bhubaneswar', verified: true },
    { _id: 'user-business', name: 'Rohan Mishra', email: 'buyer@kishanbhaiya.demo', phone: '9876501002', role: 'business_buyer', organization: 'Kalinga Kitchens', location: 'Bhubaneswar', verified: true },
    { _id: 'user-farmer', name: 'Mahesh Nayak', email: 'farmer@kishanbhaiya.demo', phone: '9876501003', role: 'farmer', organization: 'Nayak Family Farm', location: 'Khordha', verified: true },
    { _id: 'user-fpo', name: 'Madhabi Sethi', email: 'fpo@kishanbhaiya.demo', phone: '9876501004', role: 'fpo_manager', organization: 'Utkal Harvest FPO', location: 'Cuttack', verified: true },
    { _id: 'user-logistics', name: 'Sujit Behera', email: 'logistics@kishanbhaiya.demo', phone: '9876501005', role: 'logistics', organization: 'KisanExpress Logistics', location: 'Bhubaneswar', verified: true },
    { _id: 'user-admin', name: 'Priya Rath', email: 'admin@kishanbhaiya.demo', phone: '9876501006', role: 'admin', organization: 'KisanExpress', location: 'Bhubaneswar', verified: true },
    { _id: 'user-driver', name: 'Bijay Pradhan', email: 'driver.active@kishanbhaiya.demo', phone: '9876501007', role: 'driver', organization: 'Sangram Rural Fleet', location: 'Cuttack', verified: true, currentShipmentId:'ship-driver-demo' },
    { _id: 'user-driver-bulk', name: 'Rakesh Sethi', email: 'driver.bulk@kishanbhaiya.demo', phone: '9876501014', role: 'driver', organization: 'Sangram Rural Fleet', location: 'Bhubaneswar', verified: true },
    { _id: 'user-driver-store', name: 'Sunita Barik', email: 'driver.store@kishanbhaiya.demo', phone: '9876501015', role: 'driver', organization: 'KisanExpress Urban Delivery Pool', location: 'Bhubaneswar', verified: true },
    { _id: 'user-fleet', name: 'Sangram Logistics', email: 'fleet@kishanbhaiya.demo', phone: '9876501008', role: 'logistics_partner', organization: 'Sangram Rural Fleet', location: 'Bhubaneswar', verified: true, currentShipmentId:'ship-fleet-demo' }
  ].map((user) => ({ ...user, contactVerified:true, accountStatus:'ACTIVE', verificationStatus:'APPROVED', preferredLanguage:'en' }));
  users.push(
    { _id:'user-pending-farmer', name:'Kalyani Jena', email:'pending.farmer@kishanbhaiya.demo', phone:'9876501011', role:'farmer', organization:'Jena Vegetable Farm', location:'Puri', verified:false, contactVerified:true, accountStatus:'PENDING_ADMIN_APPROVAL', verificationStatus:'PENDING', preferredLanguage:'or' },
    { _id:'user-pending-fpo', name:'Debasis Rout', email:'pending.fpo@kishanbhaiya.demo', phone:'9876501012', role:'fpo_manager', organization:'Mahanadi Producer Collective', location:'Cuttack', verified:false, contactVerified:true, accountStatus:'CHANGES_REQUESTED', verificationStatus:'CHANGES_REQUESTED', preferredLanguage:'en' },
    { _id:'user-pending-driver', name:'Prakash Sahu', email:'driver@kishanbhaiya.demo', phone:'9876501013', role:'driver', organization:'Independent Driver', location:'Bhubaneswar', verified:false, contactVerified:true, accountStatus:'PENDING_ADMIN_APPROVAL', verificationStatus:'PENDING', preferredLanguage:'hi' },
  );

  const sellers = [
    { id: 'seller-1', userId: 'user-farmer', name: 'Nayak Family Farm', type: 'Farmer', location: 'Khordha', coordinates: coords.khordha, rating: 4.9, reviews: 126, reliability: 96, completedOrders: 214, image: image('photo-1595855759920-86582396756a') },
    { id: 'seller-2', userId: 'user-fpo', name: 'Utkal Harvest FPO', type: 'FPO', location: 'Cuttack', coordinates: coords.cuttack, rating: 4.8, reviews: 243, reliability: 98, completedOrders: 487, image: image('photo-1500595046743-cd271d694d30') },
    { id: 'seller-3', name: 'Maa Mangala Growers', type: 'FPO', location: 'Puri', coordinates: coords.puri, rating: 4.7, reviews: 98, reliability: 94, completedOrders: 176, image: image('photo-1472653525502-fc569e405a74') },
    { id: 'seller-4', name: 'Subarnarekha Farmer Collective', type: 'FPO', location: 'Balasore', coordinates: coords.balasore, rating: 4.8, reviews: 181, reliability: 97, completedOrders: 302, image: image('photo-1523741543316-beb7fc7023d8') },
    { id: 'seller-5', name: 'Hirakud Organics', type: 'Farmer', location: 'Sambalpur', coordinates: coords.sambalpur, rating: 4.6, reviews: 72, reliability: 92, completedOrders: 119, image: image('photo-1586771107445-d3ca888129ff') },
    { id: 'seller-6', name: 'Satyabadi Fresh Farms', type: 'Farmer', location: 'Puri', coordinates: [85.835, 19.9], rating: 4.7, reviews: 64, reliability: 95, completedOrders: 102, image: image('photo-1500937386664-56d1dfef3854') },
    { id: 'seller-7', name: 'Barabati Vegetable Group', type: 'Farmer', location: 'Cuttack', coordinates: [85.82, 20.48], rating: 4.5, reviews: 54, reliability: 91, completedOrders: 88, image: image('photo-1464226184884-fa280b87c399') },
    { id: 'seller-8', name: 'Nayagarh Natural Produce', type: 'Farmer', location: 'Nayagarh', coordinates: coords.nayagarh, rating: 4.7, reviews: 91, reliability: 93, completedOrders: 143, image: image('photo-1523348837708-15d4a09cfac2') }
  ];

  const productBase = [
    ['tomato','Fresh Desi Tomato','Vegetables',30,26,'A','photo-1592924357228-91a4daadcfea',420,'kg','seller-2'],
    ['potato','Jyoti Potato','Vegetables',24,21,'A','photo-1518977676601-b53f82aba655',900,'kg','seller-1'],
    ['onion','Nasik Red Onion','Vegetables',32,28,'A','photo-1518977956815-dee006ed3c97',780,'kg','seller-4'],
    ['mango','Dasheri Mango','Fruits',70,62,'Premium','photo-1553279768-865429fa0078',320,'kg','seller-3'],
    ['rice','Aromatic Gobindobhog Rice','Grains',52,47,'Premium','photo-1536304993881-ff6e9eefa2a6',1800,'kg','seller-2'],
    ['wheat','Whole Sharbati Wheat','Grains',38,34,'A','photo-1574323347407-f5e1ad6d020b',1250,'kg','seller-5'],
    ['banana','Champa Banana','Fruits',42,36,'A','photo-1571771894821-ce9b6c11b08e',540,'kg','seller-3'],
    ['cauliflower','Fresh Cauliflower','Vegetables',36,31,'A','photo-1568584711271-8b57c8dcba6b',260,'kg','seller-7'],
    ['spinach','Tender Spinach Bunch','Vegetables',22,18,'A','photo-1576045057995-568f588f82fb',120,'kg','seller-1'],
    ['chili','Green Chili','Spices',64,56,'A','photo-1588252303782-cb80119abd6d',210,'kg','seller-8'],
    ['okra','Tender Okra','Vegetables',44,39,'A','photo-1425543103986-22abb7d7e8d2',360,'kg','seller-6'],
    ['brinjal','Purple Brinjal','Vegetables',34,29,'A','photo-1528826007177-f38517ce9a8a',280,'kg','seller-7'],
    ['papaya','Ripe Papaya','Fruits',38,33,'A','photo-1517282009859-f000ec3b26fe',410,'kg','seller-6'],
    ['turmeric','Lakadong Turmeric','Spices',180,156,'Premium','photo-1615485500704-8e990f9900f7',190,'kg','seller-5'],
    ['lentil','Organic Red Lentil','Pulses',112,98,'Premium','photo-1515543904379-3d757afe72e4',650,'kg','seller-4'],
    ['coconut','Fresh Green Coconut','Fruits',45,39,'A','photo-1558642452-9d2a7deb7f62',580,'piece','seller-8']
  ];
  const products = productBase.map((p, i) => ({
    _id: `prod-${p[0]}`, slug: p[0], name: p[1], category: p[2], retailPrice: p[3], bulkPrice: p[4], grade: p[5], image: image(p[6]), availableQuantity: p[7], unit: p[8], sellerId: p[9], seller: sellers.find((s) => s.id === p[9]),
    bulkThreshold: p[8] === 'piece' ? 100 : 100, minimumOrder: 1, organic: i % 4 === 0, harvestDate: days(-(i % 3)), shelfLifeDays: p[2] === 'Grains' || p[2] === 'Pulses' ? 180 : 8 + (i % 5), description: `Carefully graded ${p[1].toLowerCase()}, harvested and packed by verified Odisha producers.`, rating: 4.5 + (i % 5) / 10, reviews: 18 + i * 7, featured: i < 8, status: 'active', coordinates: sellers.find((s) => s.id === p[9]).coordinates
  }));

  const urbanStores = [
    { _id:'store-govt-bbsr', name:'KisanExpress Jan Seva Fresh Store - Patia', ownershipType:'GOVERNMENT', operatorName:'Public Market Operations', locationName:'Patia, Bhubaneswar', address:'Patia market district, Bhubaneswar', coordinates:[85.8254,20.3547], serviceRadiusKm:20, estimatedDeliveryMinutes:22, status:'OPEN', rating:4.8, hours:'06:00–22:00', facilities:['Digital weighing','Cold cabinet','Quality desk','20km express delivery'] },
    { _id:'store-franchise-sahidnagar', name:'KisanExpress Sahid Nagar Fresh Point', ownershipType:'FRANCHISE', operatorName:'Maa Tarini Urban Foods', locationName:'Sahid Nagar, Bhubaneswar', address:'Sahid Nagar market, Bhubaneswar', coordinates:[85.8412,20.2919], serviceRadiusKm:20, estimatedDeliveryMinutes:18, status:'OPEN', rating:4.7, hours:'06:30–22:30', facilities:['Express packing','EV delivery','Digital weighing','20km express delivery'] },
    { _id:'store-govt-cuttack', name:'KisanExpress Cuttack Public Fresh Store', ownershipType:'GOVERNMENT', operatorName:'Public Market Operations', locationName:'Badambadi, Cuttack', address:'Badambadi urban market, Cuttack', coordinates:[85.8793,20.4547], serviceRadiusKm:20, estimatedDeliveryMinutes:25, status:'OPEN', rating:4.6, hours:'06:00–21:30', facilities:['Collection hub linked','Quality desk','Reusable crates','20km express delivery'] },
    { _id:'store-govt-puri', name:'KisanExpress Puri Grand Road Depot', ownershipType:'GOVERNMENT', operatorName:'Shree Jagannath Agri Kendra', locationName:'Grand Road, Puri', address:'Grand Road Temple Market, Puri', coordinates:[85.8312,19.8135], serviceRadiusKm:20, estimatedDeliveryMinutes:28, status:'OPEN', rating:4.9, hours:'06:00–22:00', facilities:['Fresh temple lot sorting','Cold storage','Digital weighing','20km express delivery'] },
    { _id:'store-franchise-khandagiri', name:'KisanExpress Khandagiri Fresh Point', ownershipType:'FRANCHISE', operatorName:'Kalinga Farmers Collective', locationName:'Khandagiri, Bhubaneswar', address:'Khandagiri Square, Bhubaneswar', coordinates:[85.7876,20.2587], serviceRadiusKm:20, estimatedDeliveryMinutes:20, status:'OPEN', rating:4.7, hours:'06:30–22:00', facilities:['EV express delivery','Farm-gate direct stock','Quality check desk','20km express delivery'] },
  ];
  const storeProductIds = ['prod-tomato','prod-potato','prod-onion','prod-banana','prod-spinach','prod-okra','prod-brinjal','prod-papaya'];
  const storeInventories = urbanStores.flatMap((urbanStore,storeIndex)=>storeProductIds.map((productId,itemIndex)=>{
    const product=products.find((candidate)=>candidate._id===productId);
    const urbanDiscount=storeIndex===1?0.88:0.9;
    return { _id:`stock-${storeIndex+1}-${itemIndex+1}`,storeId:urbanStore._id,productId,stock:38+itemIndex*11-storeIndex*3,price:Number((product.retailPrice*urbanDiscount).toFixed(1)),marketPrice:product.retailPrice,minimumQuantity:product.unit==='piece'?1:.25,quantityStep:product.unit==='piece'?1:.25,status:'IN_STOCK',sourceSellerId:product.sellerId,lastRestockedAt:days(0) };
  }));

  const freshness = ['FRESH','FRESH','SELL_SOON','FRESH','URGENT'];
  const lots = Array.from({ length: 22 }, (_, i) => {
    const product = products[i % products.length];
    const state = freshness[i % freshness.length];
    return { _id: `lot-${String(i + 1).padStart(3,'0')}`, productId: product._id, sellerId: product.sellerId, product: product.name, lotCode: `KB-${String(260800 + i + 1)}`, quantity: 90 + i * 37, availableQuantity: 70 + i * 31, unit: product.unit, grade: i % 6 === 0 ? 'Premium' : 'A', harvestDate: days(-(i % 6)), expiryDate: days(state === 'URGENT' ? 1 : state === 'SELL_SOON' ? 3 : 8 + (i % 5)), freshnessState: state, storage: i % 4 === 0 ? 'Pre-cooled, 8–12°C' : 'Clean ventilated crates', perishability: ['high','medium','low'][i % 3], coldChainRequired: i % 7 === 0, currentPrice: product.retailPrice, suggestedPrice: Math.round(product.retailPrice * .82), nearbyBuyerCount: 4 + (i % 9), coordinates: product.coordinates };
  });
  lots.push(
    { ...lots[0], _id:'lot-023', lotCode:'KB-260823', sellerId:'seller-1', quantity:460, availableQuantity:430, freshnessState:'FRESH', coordinates:coords.khordha },
    { ...lots[0], _id:'lot-024', lotCode:'KB-260824', sellerId:'seller-3', quantity:620, availableQuantity:590, freshnessState:'SELL_SOON', coordinates:coords.puri },
    { ...lots[0], _id:'lot-025', lotCode:'KB-260825', sellerId:'seller-7', quantity:390, availableQuantity:360, freshnessState:'FRESH', coordinates:[85.82,20.48] }
  );

  const qualityPassports = lots.slice(0, 12).map((lot, i) => ({
    _id: `passport-${i + 1}`, lotId: lot._id, lotCode: lot.lotCode, product: lot.product, seller: sellers.find(s => s.id === lot.sellerId), grade: lot.grade, origin: sellers.find(s => s.id === lot.sellerId)?.location, harvestDate: lot.harvestDate, quantity: lot.quantity, packaging: i % 2 ? 'Food-grade ventilated crates' : 'Reusable harvest crates', status: 'Verified', qualityParameters: [{ label: 'Visual grade', value: lot.grade }, { label: 'Damage tolerance', value: '< 2%' }, { label: 'Size uniformity', value: i % 2 ? '82–90%' : '88–94%' }, { label: 'Residue declaration', value: 'Producer declared' }], certificate: i % 3 === 0 ? { name: 'Kishan Bhaiya Quality Check', reference: `QC-26-${1400+i}`, verifiedAt: days(-1) } : null, images: [products.find(p=>p._id===lot.productId).image], timeline: [ ['Farm registered', days(-7)], ['Harvest recorded', lot.harvestDate], ['FPO collection', days(-2)], ['Quality checked', days(-1)], ['Packed & ready', days(0)] ].map(([label,date])=>({label,date})) }));

  const requirements = [
    { _id:'req-1024', buyerId:'user-business', buyer:'Kalinga Kitchens', product:'Fresh Desi Tomato', productId:'prod-tomato', category:'Vegetables', quantity:2000, unit:'kg', quality:'A', targetPrice:26, requiredDate:days(5), location:'Bhubaneswar', coordinates:coords.bhubaneswar, allowPartial:true, minFillPercent:80, packaging:'Ventilated crates', transport:'Seller arranged', recurring:false, status:'NEGOTIATING', quotationsCount:4, createdAt:days(-3) },
    { _id:'req-1025', buyerId:'user-business', buyer:'Blue Lotus Hotel', product:'Jyoti Potato', productId:'prod-potato', category:'Vegetables', quantity:1200, unit:'kg', quality:'A', targetPrice:22, requiredDate:days(8), location:'Puri', coordinates:coords.puri, allowPartial:true, minFillPercent:90, packaging:'25kg mesh sacks', transport:'Either', recurring:true, frequency:'WEEKLY', status:'QUOTES_RECEIVED', quotationsCount:2, createdAt:days(-2) },
    { _id:'req-1026', buyerId:'buyer-3', buyer:'Eastern Retail Mart', product:'Nasik Red Onion', productId:'prod-onion', category:'Vegetables', quantity:3500, unit:'kg', quality:'A', targetPrice:29, requiredDate:days(11), location:'Cuttack', coordinates:coords.cuttack, allowPartial:true, minFillPercent:85, packaging:'25kg sacks', transport:'Buyer pickup', recurring:false, status:'MATCHING', quotationsCount:1, createdAt:days(-1) },
    { _id:'req-1027', buyerId:'buyer-4', buyer:'Odisha Midday Meals Trust', product:'Aromatic Gobindobhog Rice', productId:'prod-rice', category:'Grains', quantity:5000, unit:'kg', quality:'Premium', targetPrice:48, requiredDate:days(15), location:'Balasore', coordinates:coords.balasore, allowPartial:false, minFillPercent:100, packaging:'50kg sealed sacks', transport:'Seller arranged', recurring:true, frequency:'MONTHLY', status:'OPEN', quotationsCount:0, createdAt:days(0) },
    { _id:'req-1028', buyerId:'buyer-5', buyer:'Sambalpur Foods', product:'Green Chili', productId:'prod-chili', category:'Spices', quantity:800, unit:'kg', quality:'A', targetPrice:58, requiredDate:days(6), location:'Sambalpur', coordinates:coords.sambalpur, allowPartial:true, minFillPercent:75, packaging:'10kg crates', transport:'Either', recurring:false, status:'OPEN', quotationsCount:1, createdAt:days(-1) }
  ];

  const quotationSpecs = [
    ['quote-1','req-1024','seller-2',25.8,1000,0,'2026-08-28','ACCEPTED'], ['quote-2','req-1024','seller-1',25.2,420,850,'2026-08-27','NEGOTIATING'],
    ['quote-3','req-1024','seller-3',26.1,580,500,'2026-08-27','SENT'], ['quote-4','req-1024','seller-7',24.9,350,650,'2026-08-29','VIEWED'],
    ['quote-5','req-1025','seller-1',21.5,900,1200,'2026-08-31','SENT'], ['quote-6','req-1025','seller-4',22.1,1200,0,'2026-08-30','VIEWED'],
    ['quote-7','req-1026','seller-4',28.4,2100,1800,'2026-09-03','SENT'], ['quote-8','req-1028','seller-5',57,650,900,'2026-08-29','SENT']
  ];
  const quotations = quotationSpecs.map((q,i) => ({ _id:q[0], requirementId:q[1], sellerId:q[2], seller:sellers.find(s=>s.id===q[2]), pricePerUnit:q[3], quantity:q[4], transportCost:q[5], transportIncluded:q[5]===0, deliveryDate:q[6], paymentTerms:i%2?'50% advance, balance on delivery':'Payment within 7 days', packaging:'As specified by buyer', validUntil:days(4+i), note:'Produce can be packed after final quality check.', status:q[7], createdAt:days(-2) }));
  const negotiations = [
    { _id:'neg-1', quotationId:'quote-2', status:'ACTIVE', offers:[
      { id:'offer-1', sender:'Nayak Family Farm', senderRole:'seller', pricePerUnit:25.2, quantity:420, deliveryDate:days(4), transportCost:850, paymentTerms:'50% advance', message:'Fresh morning harvest; same-day dispatch.', createdAt:days(-2), current:false },
      { id:'offer-2', sender:'Kalinga Kitchens', senderRole:'buyer', pricePerUnit:24, quantity:420, deliveryDate:days(4), transportCost:500, paymentTerms:'Payment on delivery', message:'Can you meet us closer to the reference price?', createdAt:days(-1), current:false },
      { id:'offer-3', sender:'Nayak Family Farm', senderRole:'seller', pricePerUnit:24.6, quantity:420, deliveryDate:days(4), transportCost:500, paymentTerms:'Payment on delivery', message:'Final offer with shared transport cost.', createdAt:days(0), current:true }
    ]},
    { _id:'neg-2', quotationId:'quote-5', status:'ACTIVE', offers:[{ id:'offer-4', sender:'Nayak Family Farm', senderRole:'seller', pricePerUnit:21.5, quantity:900, deliveryDate:days(8), transportCost:1200, paymentTerms:'Weekly invoice', message:'Available for recurring weekly supply.', createdAt:days(-1), current:true }]},
    { _id:'neg-3', quotationId:'quote-1', status:'ACCEPTED', offers:[{ id:'offer-5', sender:'Utkal Harvest FPO', senderRole:'seller', pricePerUnit:25.8, quantity:1000, deliveryDate:days(5), transportCost:0, paymentTerms:'7 days', message:'Consolidated Grade A lot.', createdAt:days(-2), current:true }]}
  ];

  const expectedHarvests = [
    ['harvest-1','prod-tomato','Fresh Desi Tomato','seller-1',2500,2000,12,'A',25], ['harvest-2','prod-mango','Dasheri Mango','seller-3',1800,960,18,'Premium',64],
    ['harvest-3','prod-rice','Aromatic Gobindobhog Rice','seller-2',8000,4300,24,'Premium',47], ['harvest-4','prod-cauliflower','Fresh Cauliflower','seller-7',1400,420,9,'A',31], ['harvest-5','prod-turmeric','Lakadong Turmeric','seller-5',3100,850,32,'Premium',150]
  ].map((h)=>({ _id:h[0], productId:h[1], product:h[2], sellerId:h[3], expectedQuantity:h[4], reservedQuantity:h[5], expectedHarvestDate:days(h[6]), grade:h[7], minimumPrice:h[8], unit:'kg', status:'UPCOMING', location:sellers.find(s=>s.id===h[3]).location, interestedBuyers:3+Math.round(h[5]/500) }));
  const reservations = expectedHarvests.map((h,i)=>({ _id:`reservation-${i+1}`, harvestId:h._id, buyerId:i<2?'user-business':`buyer-${i+3}`, quantity:Math.min(h.reservedQuantity, 500+i*150), status:'ACTIVE', conditional:true, createdAt:days(-2) }));

  const orders = [
    { _id:'order-KB260821', buyerId:'user-consumer', type:'RETAIL', status:'IN_TRANSIT', paymentStatus:'PAID_MOCK', createdAt:days(-2), deliveryDate:days(0), total:768, deliveryFee:49, items:[{ productId:'prod-tomato', name:'Fresh Desi Tomato', quantity:6, price:30, image:products[0].image },{ productId:'prod-rice', name:'Aromatic Gobindobhog Rice', quantity:10, price:52, image:products[4].image }], shipmentId:'ship-1' },
    { _id:'order-KB260814', buyerId:'user-consumer', type:'RETAIL', status:'DELIVERED', paymentStatus:'PAID_MOCK', createdAt:days(-9), deliveryDate:days(-7), total:482, deliveryFee:0, items:[{ productId:'prod-mango', name:'Dasheri Mango', quantity:5, price:70, image:products[3].image },{ productId:'prod-spinach', name:'Tender Spinach Bunch', quantity:6, price:22, image:products[8].image }] },
    { _id:'order-KB260805', buyerId:'user-consumer', type:'RETAIL', status:'DELIVERED', paymentStatus:'COD_COLLECTED', createdAt:days(-18), deliveryDate:days(-16), total:610, deliveryFee:49, items:[{ productId:'prod-potato', name:'Jyoti Potato', quantity:10, price:24, image:products[1].image },{ productId:'prod-onion', name:'Nasik Red Onion', quantity:10, price:32, image:products[2].image }] },
    { _id:'order-BULK1042', buyerId:'user-business', type:'BULK', requirementId:'req-1024', status:'CONFIRMED', paymentStatus:'PAYMENT_DUE', createdAt:days(-1), deliveryDate:days(5), total:25800, items:[{ productId:'prod-tomato', name:'Fresh Desi Tomato', quantity:1000, price:25.8, image:products[0].image }], sellerId:'seller-2', shipmentId:'ship-2' },
    { _id:'order-load-demo', buyerId:'user-business', type:'BULK_DIRECT', status:'READY_FOR_DISPATCH', paymentStatus:'PAYMENT_DUE', createdAt:days(0), deliveryDate:days(1), total:7560, items:[{ productId:'prod-banana', name:'Champa Banana', quantity:180, price:42, image:products[6].image }], sellerId:'seller-3', shipmentId:'ship-load-demo' }
  ];

  const shipments = [
    { _id:'ship-1', orderIds:['order-KB260821'], status:'IN_TRANSIT', vehicle:'OD 02 BX 1842 · Tata Ace EV', fleetPartner:'Sangram Logistics', phone:'•••• 1008', capacity:750, load:510, coldChain:false, distance:38, duration:82, eta:days(.15), utilization:68, weather:'Light rain possible near Cuttack; advisory only', stops:[{type:'PICKUP',label:'Nayak Family Farm',coordinates:coords.khordha,status:'COMPLETED'},{type:'HUB',label:'Mancheswar Collection Hub',coordinates:[85.858,20.322],status:'COMPLETED'},{type:'DELIVERY',label:'Bhubaneswar delivery',coordinates:coords.bhubaneswar,status:'NEXT'}], timeline:['Order confirmed','Picked up','Quality checked at hub','In transit'] },
    { _id:'ship-2', orderIds:['order-BULK1042'], status:'PLANNED', vehicle:'OD 05 AJ 6108 · Eicher Pro', fleetPartner:'Sangram Logistics', capacity:3000, load:2000, coldChain:true, temperatureRange:'8–12°C', temperature:9.6, distance:54, duration:108, eta:days(5), utilization:67, weather:'No significant risk in planned window', stops:[{type:'PICKUP',label:'Barabati Vegetable Group',coordinates:[85.82,20.48],status:'PENDING'},{type:'PICKUP',label:'Utkal Harvest FPO',coordinates:coords.cuttack,status:'PENDING'},{type:'HUB',label:'Cuttack Agri Hub',coordinates:[85.86,20.45],status:'PENDING'},{type:'DELIVERY',label:'Kalinga Kitchens',coordinates:coords.bhubaneswar,status:'PENDING'}], timeline:['Shipment planned','Vehicle assigned'] },
    { _id:'ship-3', orderIds:['order-demo-3'], fleetPartnerUserId:'user-fleet', status:'READY_FOR_PICKUP', vehicle:'OD 33 T 4021 · Mahindra Bolero', fleetPartner:'Sangram Logistics', capacity:1400, load:1050, coldChain:false, distance:71, duration:132, eta:days(1), utilization:75, stops:[{type:'PICKUP',label:'Satyabadi Fresh Farms',coordinates:[85.835,19.9],status:'PENDING'},{type:'DELIVERY',label:'Puri Beach Hotel Cluster',coordinates:coords.puri,status:'PENDING'}], timeline:['Vehicle assigned'] },
    { _id:'ship-4', orderIds:['order-demo-4'], status:'DELAYED', vehicle:'OD 15 N 7712 · Ashok Leyland Dost', fleetPartner:'Sangram Logistics', capacity:1600, load:1450, coldChain:false, distance:29, duration:74, eta:days(.5), utilization:91, weather:'Heavy rain risk at pickup — dispatcher acknowledgement required', stops:[{type:'PICKUP',label:'Hirakud Organics',coordinates:coords.sambalpur,status:'DELAYED'},{type:'DELIVERY',label:'Sambalpur Foods',coordinates:[84.00,21.48],status:'PENDING'}], timeline:['Vehicle assigned','Pickup delayed by weather'] },
    { _id:'ship-5', orderIds:['order-demo-5'], status:'DELIVERED', vehicle:'OD 01 R 9941 · Tata Intra', fleetPartner:'Sangram Logistics', capacity:1000, load:820, coldChain:false, distance:44, duration:91, eta:days(-1), utilization:82, stops:[{type:'PICKUP',label:'Subarnarekha Farmer Collective',coordinates:coords.balasore,status:'COMPLETED'},{type:'DELIVERY',label:'Eastern Retail Mart',coordinates:[86.88,21.46],status:'COMPLETED'}], timeline:['Picked up','Hub received','Out for delivery','Proof of delivery captured'] },
    { _id:'ship-fleet-demo', orderIds:['order-fleet-demo'], vehicleId:'vehicle-fleet-demo', fleetPartnerUserId:'user-fleet', status:'READY_FOR_PICKUP', vehicle:'OD 05 BP 8812 · Tata Ace EV', fleetPartner:'Sangram Logistics', phone:'•••• 1008', capacity:900, load:620, coldChain:false, distance:42, duration:88, eta:days(.75), utilization:69, stops:[{type:'PICKUP',label:'Utkal Harvest FPO',coordinates:coords.cuttack,status:'PENDING'},{type:'HUB',label:'Mancheswar Collection Hub',coordinates:[85.858,20.322],status:'PENDING'},{type:'DELIVERY',label:'Bhubaneswar buyer cluster',coordinates:coords.bhubaneswar,status:'PENDING'}], timeline:['Vehicle assigned','Pickup confirmation pending'] },
    { _id:'ship-driver-demo', orderIds:['order-driver-demo'], vehicleId:'vehicle-driver-demo', driverUserId:'user-driver', fleetPartnerUserId:'user-fleet', status:'READY_FOR_PICKUP', vehicle:'OD 05 BX 8813 · Tata Ace', driver:'Bijay Pradhan', fleetPartner:'Sangram Logistics', phone:'•••• 1007', capacity:700, load:420, coldChain:false, distance:34, duration:72, eta:days(.5), utilization:60, stops:[{type:'PICKUP',label:'Nayak Family Farm',coordinates:coords.khordha,status:'PENDING'},{type:'DELIVERY',label:'Bhubaneswar buyer cluster',coordinates:coords.bhubaneswar,status:'PENDING'}], timeline:['Fleet dispatched vehicle','Driver assigned'] },
    { _id:'ship-load-demo', orderIds:['order-load-demo'], source:'IN_TRANSIT_LOAD_POOL', product:'Champa Banana', status:'PLANNED', dispatchRequired:true, vehicleId:null, fleetPartnerUserId:null, vehicle:'Awaiting compatible in-transit vehicle', fleetPartner:'Fleet review pending', capacity:180, load:180, coldChain:false, coldChainRequired:false, distance:18, duration:48, eta:days(.7), utilization:100, stops:[{id:'load-pickup-1',type:'PICKUP',label:'Cuttack Banana Collection Point',coordinates:[85.865,20.438],quantity:180,unit:'kg',status:'PENDING'},{id:'load-delivery-1',type:'DELIVERY',label:'Bhubaneswar Retail Kitchen',coordinates:[85.835,20.312],quantity:180,unit:'kg',status:'PENDING'}], timeline:['Load opened for in-transit capacity sharing'] }
  ];

  const members = [
    ['member-1','Sabita Naik','lot-001',380,350],['member-2','Duryodhan Sethi','lot-006',520,500],['member-3','Kuni Behera','lot-011',310,300],['member-4','Gopal Swain','lot-016',460,440],['member-5','Manasi Rout','lot-021',290,275]
  ].map(m=>({_id:m[0], fpoId:'seller-2', farmer:m[1], lotId:m[2], product:'Fresh Desi Tomato', grade:'A', availableQuantity:m[3], selectedQuantity:m[4], status:'ACTIVE'}));
  const settlements = members.map((m,i)=>({ _id:`settlement-${i+1}`, fpoId:'seller-2', memberId:m._id, farmer:m.farmer, contributedQuantity:m.selectedQuantity, acceptedQuantity:m.selectedQuantity-(i%2?5:0), realizedRate:25.8, grossAmount:(m.selectedQuantity-(i%2?5:0))*25.8, deductions:Math.round(m.selectedQuantity*0.68), netAmount:Math.round((m.selectedQuantity-(i%2?5:0))*25.8-m.selectedQuantity*.68), status:i<2?'PAID':'PENDING' }));

  const recurring = [
    { _id:'recurring-1', buyerId:'user-business', product:'Fresh Desi Tomato', frequency:'WEEKLY', quantity:450, unit:'kg', weekdays:['Tuesday','Friday'], grade:'A', priceBand:[24,29], status:'ACTIVE', nextRun:days(2) },
    { _id:'recurring-2', buyerId:'user-business', product:'Jyoti Potato', frequency:'WEEKLY', quantity:300, unit:'kg', weekdays:['Monday'], grade:'A', priceBand:[20,24], status:'ACTIVE', nextRun:days(1) },
    { _id:'recurring-3', buyerId:'buyer-4', product:'Aromatic Gobindobhog Rice', frequency:'MONTHLY', quantity:5000, unit:'kg', weekdays:['Thursday'], grade:'Premium', status:'PAUSED', nextRun:days(18) }
  ];

  const priceSnapshots = products.slice(0,10).flatMap((p,pi)=>Array.from({length:30},(_,i)=>({ _id:`price-${pi}-${i}`, productId:p._id, date:days(-29+i), marketplaceMedian:Number((p.bulkPrice + Math.sin(i/3)*2 + (i/20)).toFixed(1)), localReference:Number((p.bulkPrice*1.03 + Math.cos(i/4)*1.4).toFixed(1)), sellerAverage:Number((p.bulkPrice*.98 + Math.sin(i/5)*1.2).toFixed(1)), source:'Kishan Bhaiya marketplace seed + configured local reference', indicative:true })));
  const notifications = [
    ['note-1','user-business','New counter offer','Nayak Family Farm countered at ₹24.60/kg.','NEGOTIATION','quote-2'],
    ['note-2','user-business','Shipment in transit','Order KB260821 left Mancheswar hub.','SHIPMENT','ship-1'],
    ['note-3','user-farmer','Sell-soon inventory','Lot KB-260803 has about 3 days of shelf life remaining.','SURPLUS','lot-003'],
    ['note-4','user-fpo','New bulk requirement','2,000kg Grade A tomatoes required in Bhubaneswar.','REQUIREMENT','req-1024'],
    ['note-5','user-logistics','Weather advisory','Heavy rain may affect pickup for shipment SHIP-4.','WEATHER','ship-4']
  ].map((n,i)=>({_id:n[0],userId:n[1],title:n[2],message:n[3],type:n[4],entityId:n[5],read:i>2,createdAt:days(-i/4)}));
  const disputes = [{ _id:'dispute-1', orderId:'order-demo-5', shipmentId:'ship-5', openedBy:'Eastern Retail Mart', reason:'QUALITY_MISMATCH', description:'Two crates show higher-than-agreed surface damage. Accepted quantity is under review.', status:'UNDER_REVIEW', severity:'MEDIUM', createdAt:days(-2), evidence:[products[2].image], timeline:[{label:'Dispute opened',date:days(-2)},{label:'Seller response received',date:days(-1)},{label:'Admin review started',date:days(0)}], adminNotes:'Compare delivery images with quality check photos before allocation.' }];
  const hubs = [
    { _id:'hub-1',name:'Mancheswar Collection Hub',location:'Bhubaneswar',coordinates:[85.858,20.322],capacity:12000,currentLoad:6400,storageTypes:['Ambient','Pre-cooled'],hours:'05:00–21:00' },
    { _id:'hub-2',name:'Cuttack Agri Hub',location:'Cuttack',coordinates:[85.86,20.45],capacity:18000,currentLoad:9200,storageTypes:['Ambient','Cold room'],hours:'04:00–22:00' },
    { _id:'hub-3',name:'Puri Fresh Consolidation Point',location:'Puri',coordinates:[85.84,19.84],capacity:8000,currentLoad:3100,storageTypes:['Ambient'],hours:'05:00–20:00' }
  ];
  const vehicles = [
    { _id:'vehicle-1',registration:'OD 02 BX 1842',type:'Tata Ace EV',capacity:750,coldChain:false,status:'IN_TRANSIT' },{ _id:'vehicle-2',registration:'OD 05 AJ 6108',type:'Eicher Pro',capacity:3000,coldChain:true,status:'ASSIGNED' },
    { _id:'vehicle-3',fleetPartnerUserId:'user-fleet',registration:'OD 33 T 4021',type:'Mahindra Bolero',capacity:1400,coldChain:false,status:'AVAILABLE' },{ _id:'vehicle-4',registration:'OD 15 N 7712',type:'Ashok Leyland Dost',capacity:1600,coldChain:false,status:'DELAYED' },
    { _id:'vehicle-fleet-demo',fleetPartnerUserId:'user-fleet',registration:'OD 05 BP 8812',type:'Tata Ace EV',capacity:900,coldChain:false,status:'ASSIGNED',shipmentId:'ship-fleet-demo' },
    { _id:'vehicle-driver-demo',fleetPartnerUserId:'user-fleet',driverUserId:'user-driver',registration:'OD 05 BX 8813',type:'Tata Ace',capacity:700,coldChain:false,status:'ASSIGNED',shipmentId:'ship-driver-demo' },
    { _id:'vehicle-fleet-bulk',fleetPartnerUserId:'user-fleet',driverUserId:'user-driver-bulk',registration:'OD 02 KB 2026',type:'Eicher Pro 3015',capacity:3500,coldChain:true,status:'AVAILABLE' },
    { _id:'vehicle-store-ev',fleetPartnerUserId:'user-fleet',driverUserId:'user-driver-store',serviceType:'URBAN_STORE',registration:'OD 02 UE 2026',type:'Tata Ace EV Express',capacity:350,coldChain:false,status:'AVAILABLE' }
  ];
  const auditLogs = [{_id:'audit-1',actorId:'user-admin',action:'DISPUTE_STATUS_CHANGED',entityType:'Dispute',entityId:'dispute-1',metadata:{from:'OPEN',to:'UNDER_REVIEW'},createdAt:days(-1)}];
  const verificationProfiles = users.map((user) => ({
    _id:`verification-${user._id}`,
    userId:user._id,
    role:user.role,
    overallStatus:user.accountStatus === 'ACTIVE' ? 'APPROVED' : user.accountStatus,
    submittedAt:days(user.accountStatus === 'ACTIVE' ? -30 : -2),
    approvedAt:user.accountStatus === 'ACTIVE' ? days(-29) : undefined,
    approvedBy:user.accountStatus === 'ACTIVE' ? 'user-admin' : undefined,
    rejectionReasonCode:'',
    adminNote:user.accountStatus === 'CHANGES_REQUESTED' ? 'Upload a clearer organization registration certificate and confirm the collection-centre address.' : '',
    resubmissionCount:0,
    riskFlags:[],
    missingRequirements:user._id === 'user-pending-farmer' ? ['PHOTO_ID'] : user._id === 'user-pending-driver' ? ['DRIVING_LICENCE'] : [],
  }));
  const verificationDocuments = [
    { _id:'document-pending-fpo', ownerId:'user-pending-fpo', documentType:'ORGANIZATION_REGISTRATION', documentNumberMasked:'•••• 4821', secureFileKey:'fictional-seed/organization-registration.pdf', mimeType:'application/pdf', size:184000, status:'REJECTED', reviewNote:'The uploaded scan is not readable.', createdAt:days(-2) },
  ];

  return { users, sellers, products, urbanStores, storeInventories, lots, qualityPassports, requirements, quotations, negotiations, expectedHarvests, reservations, orders, shipments, members, fpoMembershipRequests:[], settlements, recurring, priceSnapshots, notifications, disputes, hubs, vehicles, auditLogs, verificationProfiles, verificationDocuments, verificationReviews:[], aggregations:[], rescueOffers:[], subFulfillments:[], reviews:[], platformFeedback:[] };
};

export { coords };
