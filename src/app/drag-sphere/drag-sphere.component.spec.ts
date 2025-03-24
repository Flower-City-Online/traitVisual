import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DragSphereComponent } from './drag-sphere.component';

describe('DragSphereComponent', () => {
  let component: DragSphereComponent;
  let fixture: ComponentFixture<DragSphereComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DragSphereComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DragSphereComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
