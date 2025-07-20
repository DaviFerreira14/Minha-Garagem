import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMaintenance } from './edit-maintenance';

describe('EditMaintenance', () => {
  let component: EditMaintenance;
  let fixture: ComponentFixture<EditMaintenance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMaintenance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMaintenance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
