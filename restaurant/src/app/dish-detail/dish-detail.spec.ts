import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishDetail, DishSelection } from './dish-detail';
import type { CartItem } from '../services/cart';

const PIZZA: CartItem = {
  id: 10,
  title: 'Pizza',
  description: 'Popis',
  price: 900,
  quantity: 1,
  image: '',
  allergens: [],
  modifier_groups: [
    {
      id: 1,
      title: 'Veľkosť',
      is_multiple_choice: false,
      is_required: true,
      items: [
        { id: 11, title: '32 cm', extra_price: 0 },
        { id: 12, title: '45 cm', extra_price: 400 },
      ],
    },
    {
      id: 2,
      title: 'Extra',
      is_multiple_choice: true,
      is_required: false,
      items: [
        { id: 21, title: 'Syr', extra_price: 120 },
        { id: 22, title: 'Šampiňóny', extra_price: 90 },
      ],
    },
    {
      id: 3,
      title: 'Omáčka',
      is_multiple_choice: false,
      is_required: false,
      items: [{ id: 31, title: 'Cesnaková', extra_price: 50 }],
    },
  ],
};

describe('DishDetail', () => {
  let component: DishDetail;
  let fixture: ComponentFixture<DishDetail>;
  let confirmed: DishSelection[];

  const [size, extras, sauce] = PIZZA.modifier_groups!;

  beforeEach(async () => {
    // jsdom has no <dialog> API and no scrollIntoView
    Element.prototype.scrollIntoView ??= function () {};
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; };

    await TestBed.configureTestingModule({ imports: [DishDetail] }).compileComponents();

    fixture = TestBed.createComponent(DishDetail);
    component = fixture.componentInstance;
    confirmed = [];
    component.confirmed.subscribe((selection) => confirmed.push(selection));

    fixture.componentRef.setInput('dish', PIZZA);
    await fixture.whenStable();
  });

  it('blocks adding until every required group has a choice', () => {
    component.confirm();

    expect(confirmed.length).toBe(0);
    expect(component.isMissing(size)).toBe(true);

    component.toggle(size, size.items[0]);
    component.confirm();

    expect(confirmed.length).toBe(1);
  });

  it('calculates the total from options and quantity', () => {
    component.toggle(size, size.items[1]);
    component.toggle(extras, extras.items[0]);
    component.changeQuantity(1);

    expect(component.unit_price()).toBe(900 + 400 + 120);
    expect(component.total_price()).toBe((900 + 400 + 120) * 2);
  });

  it('unticks a multiple-choice option without touching the others', () => {
    component.toggle(extras, extras.items[0]);
    component.toggle(extras, extras.items[1]);
    component.toggle(extras, extras.items[1]);

    expect(component.isSelected(extras, extras.items[0])).toBe(true);
    expect(component.isSelected(extras, extras.items[1])).toBe(false);
  });

  it('lets an optional single choice be cleared, but not a required one', () => {
    component.toggle(sauce, sauce.items[0]);
    component.toggle(sauce, sauce.items[0]);
    expect(component.isSelected(sauce, sauce.items[0])).toBe(false);

    component.toggle(size, size.items[0]);
    component.toggle(size, size.items[0]);
    expect(component.isSelected(size, size.items[0])).toBe(true);
  });

  it('keeps the quantity between 1 and 20', () => {
    component.changeQuantity(-5);
    expect(component.quantity()).toBe(1);

    component.changeQuantity(50);
    expect(component.quantity()).toBe(20);
  });

  it('starts fresh for every opened dish', async () => {
    component.toggle(size, size.items[1]);
    component.changeQuantity(2);

    fixture.componentRef.setInput('dish', null);
    await fixture.whenStable();
    fixture.componentRef.setInput('dish', PIZZA);
    await fixture.whenStable();

    expect(component.selected_items().length).toBe(0);
    expect(component.quantity()).toBe(1);
  });
});
