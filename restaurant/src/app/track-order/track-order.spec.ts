import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { TrackOrder, progressStep } from './track-order';
import type { OrderDetails } from '../services/order';

const ORDER: OrderDetails = {
  id: 1,
  tracking_code: 'AB12CD',
  first_name: 'Ján',
  last_name: 'Novák',
  address: 'Hlavná 1',
  city: 'Bratislava',
  phone_number: '+421900000000',
  message: null,
  price: 2600,
  tip: 250,
  total_price: 2850,
  status: 'COMPLETED',
  cash_on_delivery: false,
  creation_time: '2026-11-12T12:00:00+01:00',
  items: [
    { line_id: 1, dish_id: 10, title: 'Pizza', image: null, quantity: 2, unit_price: 1300, modifiers: ['45 cm', 'Syr navyše'], rating: 4 },
    { line_id: 2, dish_id: 10, title: 'Pizza', image: null, quantity: 1, unit_price: 900, modifiers: ['32 cm'], rating: 4 },
  ],
};

describe('progressStep', () => {
  it('maps every status to a step of the progress bar', () => {
    expect(['PENDING', 'PAID', 'PREPARING', 'DELIVERING', 'COMPLETED', 'CANCELLED'].map((s) => progressStep(s as never))).toEqual([0, 0, 1, 2, 3, -1]);
  });
});

describe('TrackOrder', () => {
  let fixture: ComponentFixture<TrackOrder>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackOrder],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ tracking_code: 'ab12cd' })) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrackOrder);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('shows the items with their chosen options and the tip', async () => {
    http.expectOne((req) => req.url.endsWith('/api/order-status/AB12CD/')).flush({ success: true, message: '', order_details: ORDER });
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('45 cm, Syr navyše');
    expect(text).toContain('Prepitné');
    expect(text).toContain('28,50');
    expect(text).toContain('Objednávka bola doručená');
  });

  it('rates each dish once and pre-fills earlier ratings', async () => {
    http.expectOne(() => true).flush({ success: true, message: '', order_details: ORDER });
    await fixture.whenStable();

    const component = fixture.componentInstance;
    expect(component.rateable().length).toBe(1);
    expect(component.ratings()[10]).toBe(4);

    component.rate(10, 5);
    component.sendRating();

    const request = http.expectOne((req) => req.url.endsWith('/api/send-rating/'));
    expect(request.request.body).toEqual({ tracking_code: 'AB12CD', all_ratings: [{ dish_id: 10, rating: 5 }] });
    request.flush({ success: true, message: '' });
    expect(component.rating_sent()).toBe(true);
  });

  it('offers to search for another code when the order does not exist', async () => {
    http.expectOne(() => true).flush({ success: false, message: '' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(fixture.componentInstance.state()).toBe('not-found');
    expect((fixture.nativeElement as HTMLElement).querySelector('#find-code')).toBeTruthy();
  });
});
