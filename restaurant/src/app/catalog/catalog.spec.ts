import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Catalog, dishCountLabel } from './catalog';
import type { CartItem } from '../services/cart';

const dish = (id: number, title: string, category_id: number | null, description = ''): CartItem => ({
  id,
  title,
  description,
  category_id,
  price: 1000,
  quantity: 1,
  image: '',
  allergens: [],
  modifier_groups: [],
});

describe('Catalog', () => {
  let component: Catalog;
  let fixture: ComponentFixture<Catalog>;
  let http: HttpTestingController;

  beforeEach(async () => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; };

    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne((req) => req.url.endsWith('/api/get-categories/')).flush({ success: true, filter_groups: [] });
    http.expectOne((req) => req.url.endsWith('/api/dishes/')).flush({
      success: true,
      dishes: [
        dish(1, 'Kurací šalát', 6, 'Čerstvá zelenina'),
        dish(2, 'Pizza Margherita', 1, 'Paradajková omáčka'),
        dish(3, 'Hovädzí burger', 7),
      ],
    });
  });

  it('loads the dishes', () => {
    expect(component.state()).toBe('ready');
    expect(component.filtered().length).toBe(3);
  });

  it('searches titles and descriptions without diacritics', () => {
    component.query.set('kuraci');
    expect(component.filtered().map((d) => d.id)).toEqual([1]);

    component.query.set('PARADAJKOVA');
    expect(component.filtered().map((d) => d.id)).toEqual([2]);
  });

  it('combines the search with the category', () => {
    component.category.set(1);
    expect(component.filtered().map((d) => d.id)).toEqual([2]);

    component.query.set('burger');
    expect(component.filtered().length).toBe(0);

    component.resetFilters();
    expect(component.filtered().length).toBe(3);
  });

  it('shows the error state when the dishes cannot be loaded', () => {
    component.loadDishes();
    http.expectOne((req) => req.url.endsWith('/api/dishes/')).flush(null, { status: 500, statusText: 'Error' });

    expect(component.state()).toBe('error');
  });
});

describe('dishCountLabel', () => {
  it('uses the Slovak plural forms', () => {
    expect(dishCountLabel(0)).toBe('0 jedál');
    expect(dishCountLabel(1)).toBe('1 jedlo');
    expect(dishCountLabel(3)).toBe('3 jedlá');
    expect(dishCountLabel(5)).toBe('5 jedál');
  });
});
