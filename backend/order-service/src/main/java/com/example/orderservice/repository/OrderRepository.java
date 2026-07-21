package com.example.orderservice.repository;

import com.example.orderservice.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;

// OrderService builds all order searches by hand via MongoTemplate (see
// OrderService.searchOrders), so this repository only needs the CRUD methods
// MongoRepository already provides (findById, save, deleteById...).
public interface OrderRepository extends MongoRepository<Order, String> {
}
