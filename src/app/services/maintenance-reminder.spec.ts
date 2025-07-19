import { TestBed } from '@angular/core/testing';

import { MaintenanceReminder } from './maintenance-reminder';

describe('MaintenanceReminder', () => {
  let service: MaintenanceReminder;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MaintenanceReminder);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
