import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly base = 'http://localhost:8083/api/media';
  constructor(private readonly http: HttpClient) {}

  upload(file: File, productId: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('productId', productId);
    return this.http.post(this.base + '/upload', form);
  }

  byProduct(productId: string) {
    return this.http.get<any[]>(`${this.base}/product/${productId}`);
  }
}
