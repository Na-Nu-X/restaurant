import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DishCard } from './dish-card';
import type { CartItem } from '../services/cart';

const DISH: CartItem = {
  id: 1,
  title: 'Pizza',
  description: 'Popis',
  price: 899,
  quantity: 1,
  image: '',
  allergens: [{ number: 1, name: 'Lepok' }, { number: 7, name: 'Mlieko' }],
  modifier_groups: [],
};

describe('DishCard', () => {
  let fixture: ComponentFixture<DishCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DishCard] }).compileComponents();
    fixture = TestBed.createComponent(DishCard);
    fixture.componentRef.setInput('dish', DISH);
    await fixture.whenStable();
  });

  it('shows the title, price and allergen numbers', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Pizza');
    expect(text).toContain('8,99');
    expect(text).toContain('Alergény: 1, 7');
  });

  it('emits quick add without opening the card', () => {
    const opened: CartItem[] = [];
    const added: CartItem[] = [];
    fixture.componentInstance.opened.subscribe((d) => opened.push(d));
    fixture.componentInstance.quick_added.subscribe((d) => added.push(d));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.dish__add')!.click();

    expect(added.length).toBe(1);
    expect(opened.length).toBe(0);
  });
});
