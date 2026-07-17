import { TestBed } from '@angular/core/testing';

import { Message } from './message';

describe('Message', () => {
  let service: Message;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Message);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
