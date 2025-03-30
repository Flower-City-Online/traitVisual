import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraitVizComponent } from './trait-viz.component';

describe('TraitVizComponent', () => {
  let component: TraitVizComponent;
  let fixture: ComponentFixture<TraitVizComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TraitVizComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TraitVizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
