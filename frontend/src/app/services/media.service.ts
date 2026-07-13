import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs'; // ← AJOUTER CETTE LIGNE

@Injectable({ providedIn: 'root' })
export class MediaService {
  constructor(private http: HttpClient) {}

  upload(formData: FormData): Observable<any> {
    return this.http.post('/api/media/upload', formData);
  }

  byProduct(productId: string): Observable<any[]> {
    return this.http.get<any[]>(`/api/media/product/${productId}`);
  }
}