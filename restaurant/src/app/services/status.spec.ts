import { TestBed } from '@angular/core/testing';

import { Status } from './status';

describe('Status', () => {
  let service: Status;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Status);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
