import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-list',
  imports: [],
  templateUrl: './skeleton-list.html',
  styleUrl: './skeleton-list.scss',
})
export class SkeletonList {
  readonly rows = input(5);
  readonly variant = input<'row' | 'chat'>('row');

  protected readonly items = computed(() => Array.from({ length: this.rows() }, (_, i) => i));
}
