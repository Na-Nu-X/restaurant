import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackOrder } from './track-order';

describe('TrackOrder', () => {
  let component: TrackOrder;
  let fixture: ComponentFixture<TrackOrder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackOrder],
    }).compileComponents();

    fixture = TestBed.createComponent(TrackOrder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
