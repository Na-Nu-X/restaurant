import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ContactForm, validateContact } from './contact-form';

describe('validateContact', () => {
  it('requires every field and a valid e-mail', () => {
    expect(Object.keys(validateContact({ first_name: '', last_name: '', email_address: '', message: ' ' })).length).toBe(4);
    expect(validateContact({ first_name: 'Ján', last_name: 'Novák', email_address: 'jan@', message: 'Ahoj' }).email_address).toBeTruthy();
    expect(validateContact({ first_name: 'Ján', last_name: 'Novák', email_address: 'jan@example.sk', message: 'Ahoj' })).toEqual({});
  });
});

describe('ContactForm', () => {
  let fixture: ComponentFixture<ContactForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactForm);
    await fixture.whenStable();
  });

  it('shows inline errors instead of sending an empty form', async () => {
    fixture.componentInstance.sendMessage();
    await fixture.whenStable();

    const errors = (fixture.nativeElement as HTMLElement).querySelectorAll('.field__error');
    expect(errors.length).toBe(4);
    expect(fixture.componentInstance.sending()).toBe(false);
  });
});
