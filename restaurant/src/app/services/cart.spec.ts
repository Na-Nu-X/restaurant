import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Cart, CartItem, ModifierItem, applyDiscount, calculateTotals } from './cart';

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

    expect(service.items().length).toBe(1);
    expect(service.items()[0].price).toBe(900 + 400 + 120);
    expect(service.items()[0].quantity).toBe(2);
  });

  it('merges lines with the same options, regardless of their order', () => {
    service.addToCart(PIZZA, [LARGE, CHEESE], 1);
    service.addToCart(PIZZA, [CHEESE, LARGE], 2);

    expect(service.items().length).toBe(1);
    expect(service.items()[0].quantity).toBe(3);
  });

  it('keeps different options on separate lines', () => {
    service.addToCart(PIZZA, [LARGE], 1);
    service.addToCart(PIZZA, [], 1);

    expect(service.items().length).toBe(2);
  });

  it('counts quantities for the cart badge', () => {
    service.addToCart(PIZZA, [], 3);
    service.addToCart(PIZZA, [LARGE], 1);

    expect(service.count()).toBe(4);
  });

  it('changes quantities and removes a line at zero', () => {
    service.addToCart(PIZZA, [LARGE], 2);
    const key = service.items()[0].line_key!;

    service.setQuantity(key, 5);
    expect(service.items()[0].quantity).toBe(5);

    service.setQuantity(key, 0);
    expect(service.items().length).toBe(0);
    expect(localStorage.getItem('cart_items')).toBeNull();
  });

  it('restores a removed line without adding the surcharges again', () => {
    service.addToCart(PIZZA, [], 1);
    service.addToCart(PIZZA, [LARGE], 1);
    const removed = service.items()[0];

    service.remove(removed.line_key!);
    service.restoreLine(removed, 0);

    expect(service.items()[0]).toEqual(removed);
    expect(service.items()[1].price).toBe(1300);
  });

  it('upgrades carts saved by the previous version', () => {
    localStorage.setItem('cart_items', JSON.stringify([{ ...PIZZA, price: 1300, selected_modifiers: [LARGE] }]));

    const restored = TestBed.runInInjectionContext(() => new Cart());

    expect(restored.items()[0].line_key).toBe('10:5');
  });

  it('does not store menu-only data in the cart', () => {
    service.addToCart({ ...PIZZA, average_rating: 4.5, rating_amount: 2 }, [], 1);

    const line = service.items()[0];
    expect(line.modifier_groups).toBeUndefined();
    expect(line.average_rating).toBeUndefined();
  });
});

describe('calculateTotals', () => {
  const line = (price: number, quantity: number): CartItem => ({ ...PIZZA, price, quantity });

  it('rounds the discount half up per unit, like the back-end', () => {
    expect(applyDiscount(1005, 10)).toBe(905);
    expect(applyDiscount(1199, 10)).toBe(1079);
  });

  it('applies the discount before the tip', () => {
    const totals = calculateTotals([line(1199, 3), line(1269, 1)], 10, 10);

    expect(totals.subtotal).toBe(4866);
    expect(totals.items_total).toBe(1079 * 3 + 1142);
    expect(totals.discount).toBe(4866 - 4379);
    expect(totals.tip).toBe(438);
    expect(totals.total).toBe(4379 + 438);
  });
});
