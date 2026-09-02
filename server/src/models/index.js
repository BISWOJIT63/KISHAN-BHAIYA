import mongoose from 'mongoose';

const options = { timestamps: true, _id: false, strict: false };
const point = { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], index: '2dsphere' } };
const accountStatuses = ['REGISTERED','CONTACT_VERIFICATION_PENDING','PROFILE_INCOMPLETE','DOCUMENTS_PENDING','PENDING_ADMIN_APPROVAL','CHANGES_REQUESTED','REJECTED','SUSPENDED','ACTIVE'];
const verificationStatuses = ['NOT_SUBMITTED','PENDING','APPROVED','CHANGES_REQUESTED','REJECTED','SUSPENDED'];
const schemas = {
  User: new mongoose.Schema({ _id:String, name:{type:String,required:true}, email:{type:String,required:true,lowercase:true}, phone:String, organization:String, location:String, locationCoordinates:[Number], locationSource:String, profileImage:String, passwordHash:{type:String,required:true}, role:{type:String,required:true,index:true}, refreshTokenHash:String, verified:Boolean, contactVerified:Boolean, accountStatus:{type:String,enum:accountStatuses,index:true}, verificationStatus:{type:String,enum:verificationStatuses,index:true}, preferredLanguage:String }, options),
  Product: new mongoose.Schema({ _id:String, name:{type:String,required:true,index:true}, slug:{type:String,unique:true}, category:{type:String,index:true}, sellerId:{type:String,index:true}, retailPrice:Number, bulkPrice:Number, availableQuantity:Number, status:{type:String,index:true}, location:point }, options),
  UrbanStore: new mongoose.Schema({ _id:String,name:{type:String,required:true,index:true},ownershipType:{type:String,enum:['GOVERNMENT','FRANCHISE'],required:true,index:true},operatorName:String,locationName:String,address:String,coordinates:[Number],serviceRadiusKm:Number,estimatedDeliveryMinutes:Number,status:{type:String,index:true},rating:Number,hours:String }, options),
  StoreInventory: new mongoose.Schema({ _id:String,storeId:{type:String,required:true,index:true},productId:{type:String,required:true,index:true},stock:Number,price:Number,marketPrice:Number,minimumQuantity:Number,quantityStep:Number,status:{type:String,index:true} }, options),
  ProduceLot: new mongoose.Schema({ _id:String, productId:{type:String,index:true}, sellerId:{type:String,index:true}, lotCode:{type:String,unique:true}, availableQuantity:Number, expiryDate:{type:Date,index:true}, freshnessState:{type:String,index:true}, location:point }, options),
  BulkRequirement: new mongoose.Schema({ _id:String,buyerId:{type:String,index:true},productId:{type:String,index:true},quantity:Number,status:{type:String,index:true},requiredDate:{type:Date,index:true},location:point }, options),
  Quotation: new mongoose.Schema({ _id:String,requirementId:{type:String,index:true},sellerId:{type:String,index:true},pricePerUnit:Number,quantity:Number,status:{type:String,index:true} }, options),
  Negotiation: new mongoose.Schema({ _id:String,quotationId:{type:String,unique:true,index:true},status:String,offers:[mongoose.Schema.Types.Mixed] }, options),
  Order: new mongoose.Schema({ _id:String,buyerId:{type:String,index:true},sellerId:{type:String,index:true},status:{type:String,index:true},items:[mongoose.Schema.Types.Mixed],total:Number }, options),
  ExpectedHarvest: new mongoose.Schema({ _id:String,sellerId:{type:String,index:true},productId:String,expectedHarvestDate:{type:Date,index:true},expectedQuantity:Number,reservedQuantity:Number,status:String }, options),
  HarvestReservation: new mongoose.Schema({ _id:String,harvestId:{type:String,index:true},buyerId:{type:String,index:true},quantity:Number,status:String }, options),
  Shipment: new mongoose.Schema({ _id:String,orderIds:[String],status:{type:String,index:true},stops:[mongoose.Schema.Types.Mixed] }, options),
  QualityPassport: new mongoose.Schema({ _id:String,lotId:{type:String,unique:true,index:true},lotCode:String,status:String }, options),
  Notification: new mongoose.Schema({ _id:String,userId:{type:String,index:true},read:{type:Boolean,index:true},type:String }, options),
  PriceSnapshot: new mongoose.Schema({ _id:String,productId:{type:String,index:true},date:{type:Date,index:true},marketplaceMedian:Number }, options),
  Settlement: new mongoose.Schema({ _id:String,fpoId:{type:String,index:true},memberId:String,status:String }, options),
  RecurringRequirement: new mongoose.Schema({ _id:String,buyerId:{type:String,required:true,index:true},product:{type:String,required:true,index:true},productId:{type:String,index:true},category:String,quantity:Number,unit:String,frequency:{type:String,enum:['WEEKLY','BIWEEKLY','MONTHLY'],index:true},weekdays:[String],grade:String,priceBand:[Number],location:String,coordinates:[Number],packaging:String,transport:String,allowPartial:Boolean,minFillPercent:Number,leadTimeDays:Number,startDate:Date,status:{type:String,enum:['ACTIVE','PAUSED','ARCHIVED'],index:true},nextRun:{type:Date,index:true},lastRun:Date,lastGeneratedFor:Date,lastRequirementId:String,generatedCount:{type:Number,default:0} }, options),
  Dispute: new mongoose.Schema({ _id:String,orderId:{type:String,index:true},status:{type:String,index:true},reason:String }, options),
  VerificationProfile: new mongoose.Schema({ _id:String,userId:{type:String,required:true,unique:true,index:true},role:{type:String,required:true,index:true},overallStatus:{type:String,required:true,enum:['APPROVED',...accountStatuses],index:true},submittedAt:Date,approvedAt:Date,approvedBy:String,rejectionReasonCode:String,adminNote:String,resubmissionCount:{type:Number,default:0},riskFlags:[String],missingRequirements:[String] }, options),
  VerificationDocument: new mongoose.Schema({ _id:String,ownerId:{type:String,required:true,index:true},documentType:{type:String,required:true,index:true},documentNumberMasked:String,secureFileKey:{type:String,required:true},mimeType:String,size:Number,status:{type:String,enum:['PENDING','VERIFIED','REJECTED','EXPIRED'],default:'PENDING',index:true},expiryDate:Date,reviewedBy:String,reviewedAt:Date,reviewNote:String }, options),
  VerificationReview: new mongoose.Schema({ _id:String,profileId:{type:String,required:true,index:true},applicantId:{type:String,required:true,index:true},reviewerId:{type:String,required:true,index:true},action:{type:String,required:true,enum:['APPROVE','REQUEST_CHANGES','REJECT','SUSPEND','REACTIVATE'],index:true},reasonCode:String,note:String,previousStatus:String,nextStatus:String }, options),
  /** Buyer review of a delivered order: rates the seller (farmer/FPO) and optionally each product line. */
  Review: new mongoose.Schema({ _id:String,orderId:{type:String,required:true,index:true},buyerId:{type:String,required:true,index:true},sellerId:{type:String,index:true},productId:{type:String,index:true},rating:{type:Number,required:true,min:1,max:5,index:true},comment:String,tags:[String],verifiedPurchase:{type:Boolean,default:true} }, options),
  /** Rating of the platform itself, captured straight after checkout. */
  PlatformFeedback: new mongoose.Schema({ _id:String,userId:{type:String,required:true,index:true},orderId:{type:String,index:true},rating:{type:Number,required:true,min:1,max:5,index:true},comment:String,tags:[String],role:String }, options),
  /**
   * Profile and product images live in the database, not on disk: the serverless
   * filesystem is wiped between invocations, so a stored `/uploads/<file>` URL
   * would break minutes after upload. `data` is base64 (a plain string survives
   * both the mongo and in-memory store paths unchanged).
   */
  UploadedFile: new mongoose.Schema({ _id:String,ownerId:{type:String,required:true,index:true},mimeType:{type:String,required:true},size:Number,originalName:String,data:{type:String,required:true} }, options)
};

for (const name of ['Seller','FarmerProfile','FPOProfile','BusinessProfile','FPOMember','FPOMembershipRequest','InventoryMovement','ShipmentStop','FleetPartnerProfile','CollectionHub','Vehicle','Payment','AuditLog','Aggregation','RescueOffer','OrderSubFulfillment']) schemas[name] = new mongoose.Schema({ _id:String }, options);
export const models = Object.fromEntries(Object.entries(schemas).map(([name,schema])=>[name, mongoose.models[name] || mongoose.model(name,schema)]));
export const collectionMap = {
  users:'User', sellers:'Seller', products:'Product', urbanStores:'UrbanStore', storeInventories:'StoreInventory', lots:'ProduceLot', qualityPassports:'QualityPassport', requirements:'BulkRequirement', quotations:'Quotation', negotiations:'Negotiation', expectedHarvests:'ExpectedHarvest', reservations:'HarvestReservation', orders:'Order', shipments:'Shipment', members:'FPOMember', fpoMembershipRequests:'FPOMembershipRequest', settlements:'Settlement', recurring:'RecurringRequirement', priceSnapshots:'PriceSnapshot', notifications:'Notification', disputes:'Dispute', hubs:'CollectionHub', vehicles:'Vehicle', auditLogs:'AuditLog', aggregations:'Aggregation', rescueOffers:'RescueOffer', subFulfillments:'OrderSubFulfillment', verificationProfiles:'VerificationProfile', verificationDocuments:'VerificationDocument', verificationReviews:'VerificationReview', reviews:'Review', platformFeedback:'PlatformFeedback', uploadedFiles:'UploadedFile'
};
