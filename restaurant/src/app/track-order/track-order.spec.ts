import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackOrder } from './track-order';

describe('TrackOrder', () => {
  let component: TrackOrder;
  let fixture: ComponentFixture<TrackOrder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackOrder],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TrackOrder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
