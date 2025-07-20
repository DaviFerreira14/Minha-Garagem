import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMaintenance } from './add-maintenance';

describe('AddMaintenance', () => {
  let component: AddMaintenance;
  let fixture: ComponentFixture<AddMaintenance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMaintenance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMaintenance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
