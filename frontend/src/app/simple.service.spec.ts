import { TestBed } from '@angular/core/testing';

export class SimpleService {
  add(a: number, b: number): number { return a + b; }
  isSeller(role: string): boolean { return role === 'SELLER'; }
}

describe('SimpleService', () => {
  let service: SimpleService;

  beforeEach(() => { service = new SimpleService(); });

  it('should add two numbers correctly', () => {
    expect(service.add(2, 3)).toBe(5);
    expect(service.add(-1, 1)).toBe(0);
  });

  it('should correctly identify SELLER role', () => {
    expect(service.isSeller('SELLER')).toBeTrue();
    expect(service.isSeller('USER')).toBeFalse();
  });
});