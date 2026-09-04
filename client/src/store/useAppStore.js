import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore=create(persist((set,get)=>({
  user:null,accessToken:null,location:'India',language:'en',cart:[],savedProducts:[],recentProducts:[],cartOpen:false,mobileMenu:false,
  lowBandwidth:false,orderAlerts:true,marketAlerts:true,
  /** Guided tour: `tourSeen` persists so first-run only fires once; `tourRunning` is session-only. */
  tourSeen:false,tourRunning:false,
  startTour:()=>set({tourRunning:true}),
  endTour:()=>set({tourRunning:false,tourSeen:true}),
  setSession:(user,accessToken)=>set({user,accessToken}),clearSession:()=>set({user:null,accessToken:null}),
  setLocation:(location)=>set({location}),setLanguage:(language)=>set({language}),setCartOpen:(cartOpen)=>set({cartOpen}),setMobileMenu:(mobileMenu)=>set({mobileMenu}),
  setPreferences:(preferences)=>set(preferences),
  toggleSaved:(product)=>set((state)=>({savedProducts:state.savedProducts.some((item)=>item._id===product._id)?state.savedProducts.filter((item)=>item._id!==product._id):[...state.savedProducts,product]})),
  addRecentProduct:(product)=>set((state)=>({recentProducts:[product,...state.recentProducts.filter((item)=>item._id!==product._id)].slice(0,6)})),
  addToCart:(product,quantity=1)=>set((state)=>{ const found=state.cart.find(i=>i.productId===product._id); return {cart:found?state.cart.map(i=>i.productId===product._id?{...i,quantity:Math.min(i.quantity+quantity,product.availableQuantity)}:i):[...state.cart,{productId:product._id,name:product.name,image:product.image,price:product.retailPrice,bulkPrice:product.bulkPrice,bulkThreshold:product.bulkThreshold,unit:product.unit,quantity,seller:product.seller?.name,availableQuantity:product.availableQuantity,storeId:product.storeId||null,storeName:product.storeName||null,storeInventoryId:product.storeInventoryId||null,storeDistanceKm:product.storeDistanceKm??null,estimatedDeliveryMinutes:product.estimatedDeliveryMinutes||null}]}; }),
  updateCart:(productId,quantity)=>set((state)=>({cart:quantity<=0?state.cart.filter(i=>i.productId!==productId):state.cart.map(i=>i.productId===productId?{...i,quantity:Math.min(quantity,i.availableQuantity)}:i)})),
  removeFromCart:(productId)=>set((state)=>({cart:state.cart.filter(i=>i.productId!==productId)})),clearCart:()=>set({cart:[]}),
  cartCount:()=>get().cart.reduce((n,i)=>n+i.quantity,0)
}),{name:'kishan-bhaiya-preferences',partialize:(state)=>({user:state.user,accessToken:state.accessToken,location:state.location,language:state.language,cart:state.cart,savedProducts:state.savedProducts,recentProducts:state.recentProducts,lowBandwidth:state.lowBandwidth,orderAlerts:state.orderAlerts,marketAlerts:state.marketAlerts,tourSeen:state.tourSeen})}));
