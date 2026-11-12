import { TestBed } from '@angular/core/testing';

import { Loading } from './loading';

describe('Loading', () => {
  let service: Loading;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Loading);
  });

  it('stays visible until every parallel request has finished', () => {
    service.show();
    service.show();
    service.hide();
    expect(service.is_loading()).toBe(true);

    service.hide();
    expect(service.is_loading()).toBe(false);
  });

  it('never goes below zero', () => {
    service.hide();
    service.show();
    expect(service.is_loading()).toBe(true);
  });
});
