import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolarSystemComponent } from './solar-system.component';

describe('SolarSystemComponent', () => {
  let component: SolarSystemComponent;
  let fixture: ComponentFixture<SolarSystemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolarSystemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolarSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
