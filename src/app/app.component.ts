import { Component } from '@angular/core';
import { TraitVizComponent } from './trait-viz/trait-viz.component';
// import { TraitVisualizationComponent } from './trait-visualization/trait-visualization.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TraitVizComponent],
  template: `
     <app-trait-viz></app-trait-viz>
  `,
})
export class AppComponent {}
