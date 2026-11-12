import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Filters } from './filters';

describe('Filters', () => {
  let component: Filters;
  let fixture: ComponentFixture<Filters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Filters] }).compileComponents();

    fixture = TestBed.createComponent(Filters);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('groups', [
      { id: 1, name: 'Podľa typu', categories: [{ id: 8, name: 'dezerty', icon: 'fa-solid fa-list' }] },
    ]);
    await fixture.whenStable();
  });

  it('selects a category and clears it on a second click', () => {
    component.select(8);
    expect(component.selected()).toBe(8);

    component.select(8);
    expect(component.selected()).toBeNull();
  });

  it('capitalizes names and hides the default icon', () => {
    const category = { id: 8, name: 'dezerty', icon: 'fa-solid fa-list' };
    expect(component.label(category)).toBe('Dezerty');
    expect(component.icon(category)).toBeNull();
  });
});
