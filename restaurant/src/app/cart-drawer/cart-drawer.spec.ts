import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CartDrawer, validateCustomer } from './cart-drawer';
import { Cart, CartItem } from '../services/cart';
import { Customer, Payment, buildOrderPayload } from '../services/payment';
import { Status } from '../services/status';

const PIZZA: CartItem = { id: 10, title: 'Pizza', description: '', price: 1000, quantity: 1, image: '', allergens: [] };
const CUSTOMER: Customer = { first_name: 'Ján', last_name: 'Novák', address: 'Hlavná 1', city: 'Bratislava', phone_number: '+421 900 123 456', message: null };

describe('validateCustomer', () => {
  it('requires every delivery field except the note', () => {
    const errors = validateCustomer({ ...CUSTOMER, first_name: ' ', city: '' });
    expect(Object.keys(errors).sort()).toEqual(['city', 'first_name']);
  });

  it('checks the phone number format', () => {
    expect(validateCustomer({ ...CUSTOMER, phone_number: '12' }).phone_number).toBeTruthy();
    expect(validateCustomer({ ...CUSTOMER, phone_number: '0900123456' }).phone_number).toBeUndefined();
  });
});

describe('buildOrderPayload', () => {
  it('sends option ids and adds the tip as a pseudo line', () => {
    const item: CartItem = { ...PIZZA, quantity: 2, selected_modifiers: [{ id: 5, title: '45 cm', extra_price: 400 }] };
    const payload = buildOrderPayload([item], CUSTOMER, 'TEST1', 150);

    expect(payload.items[0]).toEqual(expect.objectContaining({ id: 10, quantity: 2, modifier_ids: [5] }));
    expect(payload.items[1]).toEqual(expect.objectContaining({ id: -1, price: 150 }));
    expect(payload.coupon_code).toBe('TEST1');
  });

  it('leaves the tip out when it is zero', () => {
    expect(buildOrderPayload([PIZZA], CUSTOMER, null, 0).items.length).toBe(1);
  });
});

describe('CartDrawer', () => {
  let fixture: ComponentFixture<CartDrawer>;
  let component: CartDrawer;
  let payment: { createCheckoutSession: ReturnType<typeof vi.fn>; createCashOrder: ReturnType<typeof vi.fn> };
  let navigated: string | null;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; };
    localStorage.clear();

    payment = { createCheckoutSession: vi.fn(), createCashOrder: vi.fn() };
    navigated = null;

    await TestBed.configureTestingModule({
      imports: [CartDrawer],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Payment, useValue: payment },
        { provide: Status, useValue: { status$: of({ success: true, message: '', is_open: true }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartDrawer);
    component = fixture.componentInstance;
    TestBed.inject(Cart).addToCart(PIZZA, [], 2);
    await fixture.whenStable();

    // Avoids A Real Page Navigation
    vi.spyOn(component as any, 'redirect').mockImplementation((url: unknown) => { navigated = url as string; });

    component.open();
    component.goToDetails();
  });

  it('does not send an incomplete form', () => {
    component.submit();

    expect(component.fieldError('first_name')).toBeTruthy();
    expect(payment.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('sends a card order with the tip and goes to Stripe', () => {
    payment.createCheckoutSession.mockReturnValue(of({ success: true, message: '', url: 'https://stripe.test' }));
    component.customer.set(CUSTOMER);
    component.tip_percent.set(10);

    component.submit();

    const payload = payment.createCheckoutSession.mock.calls[0][0];
    expect(payload.items.find((line: { id: number }) => line.id === -1).price).toBe(200);
    expect(navigated).toBe('https://stripe.test');
    expect(JSON.parse(localStorage.getItem('customer')!).city).toBe('Bratislava');
  });

  it('sends a cash order without a tip', () => {
    payment.createCashOrder.mockReturnValue(of({ success: true, message: '', url: '/success-order?code=ABC123' }));
    component.customer.set(CUSTOMER);
    component.payment_method.set('cash');

    component.submit();

    expect(payment.createCashOrder.mock.calls[0][0].items.length).toBe(1);
    expect(component.totals().total).toBe(2000);
  });

  it('shows the server message inline when the order is rejected', () => {
    payment.createCheckoutSession.mockReturnValue(throwError(() => ({ status: 400, error: { message: 'Košík je prázdny.' } })));
    component.customer.set(CUSTOMER);

    component.submit();

    expect(component.server_error()).toBe('Košík je prázdny.');
    expect(component.submitting()).toBe(false);
  });
});
