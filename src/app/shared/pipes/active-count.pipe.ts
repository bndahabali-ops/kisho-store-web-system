import { Pipe, PipeTransform } from '@angular/core';
import { Product } from '../../core/models/product.model';

@Pipe({ name: 'activeCount' })
export class ActiveCountPipe implements PipeTransform {
  transform(products: Product[]): number {
    return products.filter(p => p.isActive).length;
  }
}
