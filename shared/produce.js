export const produceNames = ['Tomato', 'Potato', 'Onion', 'Brinjal', 'Okra', 'Cabbage', 'Cauliflower', 'Carrot', 'Pumpkin', 'Cucumber', 'Green Chili', 'Spinach', 'Peas', 'Beans', 'Banana', 'Mango', 'Papaya', 'Guava', 'Watermelon', 'Orange', 'Apple', 'Grapes', 'Coconut', 'Lemon', 'Pineapple', 'Rice'];
export function commodityName(value = '') {
  const text = String(value).trim();
  return produceNames.find(name => new RegExp(`\\b${name}\\b`, 'i').test(text)) || text;
}
export const sameCommodity = (first, second) => commodityName(first).toLowerCase() === commodityName(second).toLowerCase();
