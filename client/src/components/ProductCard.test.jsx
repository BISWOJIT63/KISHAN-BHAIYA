import {describe,expect,it,beforeEach} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import ProductCard from './ProductCard.jsx';
import {useAppStore} from '../store/useAppStore.js';

const product={_id:'prod-test',name:'Fresh Tomato',category:'Vegetables',retailPrice:30,bulkPrice:25,grade:'A',image:'test.jpg',availableQuantity:500,unit:'kg',bulkThreshold:2,harvestDate:'2026-08-23',rating:4.8,reviews:20,seller:{name:'Test FPO',location:'Cuttack'}};
beforeEach(()=>useAppStore.setState({user:{_id:'buyer-test',role:'consumer'},cart:[],savedProducts:[]}));
describe('ProductCard',()=>{
  it('adds item to cart and increases quantity via live stepper',()=>{
    render(<MemoryRouter><ProductCard product={product}/></MemoryRouter>);
    const addBtn = screen.getByRole('button',{name:/add to cart/i});
    fireEvent.click(addBtn);
    expect(useAppStore.getState().cart[0].quantity).toBe(1);

    const increaseBtn = screen.getByLabelText('Increase quantity');
    fireEvent.click(increaseBtn);
    expect(useAppStore.getState().cart[0].quantity).toBe(2);
  });

  it('opens product details popup modal when card is clicked',()=>{
    render(<MemoryRouter><ProductCard product={product}/></MemoryRouter>);
    fireEvent.click(screen.getAllByText('Fresh Tomato')[0]);
    expect(screen.getByText('Certified Urban Store Produce')).toBeInTheDocument();
  });

  it('hides every shopping control from producer accounts',()=>{
    useAppStore.setState({user:{_id:'farmer-test',role:'farmer'},cart:[],savedProducts:[]});
    render(<MemoryRouter><ProductCard product={product}/></MemoryRouter>);
    expect(screen.queryByLabelText('Increase quantity')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/add to cart/i})).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/save/i)).not.toBeInTheDocument();
  });
});
