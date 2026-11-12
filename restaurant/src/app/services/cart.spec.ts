import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { Cart, CartItem, ModifierItem } from './cart';

const PIZZA: CartItem = {
  id: 10,
  title: 'Pizza',
  description: '',
  price: 900,
  quantity: 1,
  image: '',
  allergens: [],
  modifier_groups: [],
};

const LARGE: ModifierItem = { id: 5, title: '45 cm', extra_price: 400 };
const CHEESE: ModifierItem = { id: 6, title: 'Syr navyše', extra_price: 120 };

describe('Cart', () => {
  let service: Cart;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(Cart);
  });

  it('adds the option surcharges to the unit price', () => {
    service.addToCart(PIZZA, [LARGE, CHEESE], 2);

    expect(service.cart_items$.length).toBe(1);
    expect(service.cart_items$[0].price).toBe(900 + 400 + 120);
    expect(service.cart_items$[0].quantity).toBe(2);
  });

  it('merges lines with the same options, regardless of their order', () => {
    service.addToCart(PIZZA, [LARGE, CHEESE], 1);
    service.addToCart(PIZZA, [CHEESE, LARGE], 2);

    expect(service.cart_items$.length).toBe(1);
    expect(service.cart_items$[0].quantity).toBe(3);
  });

  it('keeps different options on separate lines', () => {
    service.addToCart(PIZZA, [LARGE], 1);
    service.addToCart(PIZZA, [], 1);

    expect(service.cart_items$.length).toBe(2);
  });

  it('counts quantities for the cart badge', async () => {
    service.addToCart(PIZZA, [], 3);
    service.addToCart(PIZZA, [LARGE], 1);

    expect(await firstValueFrom(service.cart_amount$)).toBe(4);
  });

  it('does not store menu-only data in the cart', () => {
    service.addToCart({ ...PIZZA, average_rating: 4.5, rating_amount: 2 }, [], 1);

    const line = service.cart_items$[0];
    expect(line.modifier_groups).toBeUndefined();
    expect(line.average_rating).toBeUndefined();
  });
});
