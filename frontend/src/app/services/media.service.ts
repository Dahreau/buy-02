import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private base = 'http://localhost:8083/api/media';
  constructor(private http: HttpClient) {}

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
