import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TraitVisualizationComponent } from './trait-visualization.component';

describe('ClusterSimulationComponent', () => {
  let component: TraitVisualizationComponent;
  let fixture: ComponentFixture<TraitVisualizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TraitVisualizationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TraitVisualizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
