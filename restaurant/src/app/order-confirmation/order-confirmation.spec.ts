import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { OrderConfirmation } from './order-confirmation';
import { Cart } from '../services/cart';

async function setup(kind: 'card' | 'cash', code: string | null) {
  await TestBed.configureTestingModule({
    imports: [OrderConfirmation],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { data: { kind }, queryParamMap: convertToParamMap(code ? { code } : {}) } } },
    ],
  }).compileComponents();

  const fixture: ComponentFixture<OrderConfirmation> = TestBed.createComponent(OrderConfirmation);
  fixture.detectChanges();
  return fixture;
}

describe('OrderConfirmation', () => {
  beforeEach(() => localStorage.clear());

  it('clears the cart and shows the tracking code', async () => {
    localStorage.setItem('cart_items', JSON.stringify([{ id: 1, title: 'Pizza', description: '', price: 900, quantity: 1, image: '', allergens: [] }]));

    const fixture = await setup('card', 'abc123');
    const cart = TestBed.inject(Cart);
    TestBed.inject(HttpTestingController).expectOne((req) => req.url.endsWith('/api/order-status/abc123/')).flush({ success: false, message: '' });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(cart.items().length).toBe(0);
    expect(text).toContain('ABC123');
    expect(text).toContain('Platba prebehla úspešne!');
  });

  it('tells cash customers how much to prepare', async () => {
    const fixture = await setup('cash', 'XYZ789');
    TestBed.inject(HttpTestingController).expectOne((req) => req.url.endsWith('/api/order-status/XYZ789/')).flush({
      success: true,
      message: '',
      order_details: { id: 1, tracking_code: 'XYZ789', first_name: 'Ján', total_price: 2450, status: 'PREPARING', cash_on_delivery: true },
    });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Objednávka je prijatá!');
    expect(text).toContain('Ján');
    expect(text).toContain('24,50');
  });

  it('works without a tracking code', async () => {
    const fixture = await setup('card', null);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Kód objednávky sa nepodarilo načítať');
  });
});
