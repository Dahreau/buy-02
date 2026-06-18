import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private base = 'http://localhost:8082/api/products';
  constructor(private http: HttpClient) {}

  listAll() { return this.http.get<any[]>(this.base); }
  getOne(id: string) { return this.http.get(this.base + '/' + id); }
  create(body: any) { return this.http.post(this.base, body); }
  update(id: string, body: any) { return this.http.put(this.base + '/' + id, body); }
  delete(id: string) { return this.http.delete(this.base + '/' + id); }
}
