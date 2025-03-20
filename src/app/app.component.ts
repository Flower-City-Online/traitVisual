import { Component } from '@angular/core';
import { TraitVisualizationComponent } from './trait-visualization/trait-visualization.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TraitVisualizationComponent],
  template: `
     <app-trait-visualization></app-trait-visualization>
  `,
})
export class AppComponent {}
