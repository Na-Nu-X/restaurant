import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyMenu } from './daily-menu';

describe('DailyMenu', () => {
  let component: DailyMenu;
  let fixture: ComponentFixture<DailyMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyMenu],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
