package com.example.orderservice.service;

import com.example.orderservice.dto.*;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderItem;
import com.example.orderservice.model.OrderStatus;
import com.example.orderservice.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final WebClient.Builder webClientBuilder;
    private final MongoTemplate mongoTemplate;
    private final OrderProducer orderProducer;

    public UserStatsDTO getUserStats(String userId) {
        try {
            Aggregation baseAgg = Aggregation.newAggregation(
                    Aggregation.match(Criteria.where("userId").is(userId).and("status").ne(OrderStatus.CANCELLED.name())),
                    Aggregation.project()
                            .and(ConvertOperators.ToDouble.toDouble("$totalAmount")).as("numericAmount"),
                    Aggregation.group()
                            .sum("numericAmount").as("totalSpent")
                            .count().as("totalOrders")
            );

            Map baseResults = mongoTemplate.aggregate(baseAgg, Order.class, Map.class).getUniqueMappedResult();

            Aggregation productsAgg = Aggregation.newAggregation(
                    Aggregation.match(Criteria.where("userId").is(userId).and("status").ne(OrderStatus.CANCELLED.name())),
                    Aggregation.unwind("items"),
                    Aggregation.group("items.productId")
                            .first("items.productName").as("productName")
                            .sum("items.quantity").as("count"),
                    Aggregation.project("productName", "count").and("_id").as("productId"),
                    Aggregation.sort(Sort.Direction.DESC, "count"),
                    Aggregation.limit(5)
            );

            List<ProductSummaryDTO> topProducts = mongoTemplate.aggregate(productsAgg, Order.class, ProductSummaryDTO.class).getMappedResults();

            double spent = 0;
            long orders = 0;

            if (baseResults != null) {
                spent = baseResults.get("totalSpent") != null ? Double.parseDouble(baseResults.get("totalSpent").toString()) : 0;
                orders = baseResults.get("totalOrders") != null ? Long.parseLong(baseResults.get("totalOrders").toString()) : 0;
            }

            return UserStatsDTO.builder()
                    .totalSpent(BigDecimal.valueOf(spent))
                    .totalOrders(orders)
                    .topProducts(topProducts != null ? topProducts : new ArrayList<>())
                    .build();
        } catch (Exception e) {
            log.error("Error user stats: {}", e.getMessage());
            return UserStatsDTO.builder().totalSpent(BigDecimal.ZERO).totalOrders(0).topProducts(new ArrayList<>()).build();
        }
    }

    public SellerStatsDTO getSellerStats(String sellerId) {
        try {
            Aggregation revenueAgg = Aggregation.newAggregation(
                    Aggregation.unwind("items"),
                    Aggregation.match(Criteria.where("items.sellerId").is(sellerId).and("status").is(OrderStatus.DELIVERED.name())),
                    Aggregation.project("items.quantity")
                            .and(ConvertOperators.ToDouble.toDouble("$items.priceAtPurchase")).as("unitPrice"),
                    Aggregation.project()
                            .and(ArithmeticOperators.Multiply.valueOf("unitPrice").multiplyBy("quantity")).as("lineRevenue"),
                    Aggregation.group()
                            .sum("lineRevenue").as("totalRevenue")
                            .count().as("completedOrders")
            );

            Map revenueResults = mongoTemplate.aggregate(revenueAgg, Order.class, Map.class).getUniqueMappedResult();

            Aggregation bestSellersAgg = Aggregation.newAggregation(
                    Aggregation.unwind("items"),
                    Aggregation.match(Criteria.where("items.sellerId").is(sellerId).and("status").ne(OrderStatus.CANCELLED.name())),
                    Aggregation.group("items.productId")
                            .first("items.productName").as("productName")
                            .sum("items.quantity").as("count"),
                    Aggregation.project("productName", "count").and("_id").as("productId"),
                    Aggregation.sort(Sort.Direction.DESC, "count"),
                    Aggregation.limit(5)
            );

            List<ProductSummaryDTO> bestSellers = mongoTemplate.aggregate(bestSellersAgg, Order.class, ProductSummaryDTO.class).getMappedResults();

            double rev = 0;
            long sales = 0;

            if (revenueResults != null) {
                rev = revenueResults.get("totalRevenue") != null ? Double.parseDouble(revenueResults.get("totalRevenue").toString()) : 0;
                sales = revenueResults.get("completedOrders") != null ? Long.parseLong(revenueResults.get("completedOrders").toString()) : 0;
            }

            return SellerStatsDTO.builder()
                    .totalRevenue(BigDecimal.valueOf(rev))
                    .completedOrders(sales)
                    .bestSellers(bestSellers != null ? bestSellers : new ArrayList<>())
                    .build();
        } catch (Exception e) {
            log.error("Error seller stats: {}", e.getMessage());
            return SellerStatsDTO.builder().totalRevenue(BigDecimal.ZERO).completedOrders(0).bestSellers(new ArrayList<>()).build();
        }
    }

    public Page<Order> searchOrders(String userId, String sellerId, OrderStatus status,
            LocalDateTime start, LocalDateTime end, String keyword, Pageable pageable) {
        Query query = new Query().with(pageable);
        List<Criteria> criteriaList = new ArrayList<>();

        if (userId != null) {
            criteriaList.add(Criteria.where("userId").is(userId));
        }
        if (sellerId != null) {
            criteriaList.add(Criteria.where("items.sellerId").is(sellerId));
        }
        if (status != null) {
            criteriaList.add(Criteria.where("status").is(status));
        }
        if (start != null && end != null) {
            criteriaList.add(Criteria.where("createdAt").gte(start).lte(end));
        }
        if (keyword != null) {
            criteriaList.add(Criteria.where("items.productName").regex(keyword, "i"));
        }

        if (!criteriaList.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteriaList.toArray(new Criteria[0])));
        }

        long count = mongoTemplate.count(query, Order.class);
        List<Order> orders = mongoTemplate.find(query, Order.class);

        return new PageImpl<>(orders, pageable, count);
    }

    public Order cancelOrder(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande non trouvée"));

        if (!order.getUserId().equals(userId)) {
            throw new RuntimeException("Accès refusé");
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new RuntimeException("Seules les commandes en attente peuvent être annulées");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    public void deleteOrder(String userId, String orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande non trouvée"));

        if (!order.getUserId().equals(userId)) {
            throw new RuntimeException("Accès refusé");
        }

        if (order.getStatus() != OrderStatus.DELIVERED && order.getStatus() != OrderStatus.CANCELLED) {
            throw new RuntimeException("Impossible de supprimer une commande active");
        }

        orderRepository.deleteById(orderId);
    }

    public Order updateOrderStatus(String sellerId, String orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande non trouvée"));

        boolean isSellerOfOrder = order.getItems().stream()
                .anyMatch(item -> item.getSellerId().equals(sellerId));

        if (!isSellerOfOrder) {
            throw new RuntimeException("Accès refusé");
        }

        if (order.getStatus() == OrderStatus.PENDING && newStatus == OrderStatus.PAID) {
            order.getItems().forEach(item
                    -> orderProducer.sendStockUpdate(item.getProductId(), item.getQuantity())
            );
        }

        order.setStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }

    @Transactional
    public Order redoOrder(String userId, String orderId, String token) {
        Order oldOrder = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Commande non trouvée"));

        if (!oldOrder.getUserId().equals(userId)) {
            throw new RuntimeException("Accès refusé");
        }

        Order newOrder = Order.builder()
                .userId(userId)
                .items(oldOrder.getItems())
                .totalAmount(oldOrder.getTotalAmount())
                .status(OrderStatus.PENDING)
                .paymentMethod(oldOrder.getPaymentMethod())
                .shippingAddress(oldOrder.getShippingAddress())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return orderRepository.save(newOrder);
    }

    @Transactional
    public Order checkout(String userId, CheckoutRequest request, String token) {
        CartDTO cart = fetchCart(token);

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new RuntimeException("Le panier est vide");
        }

        BigDecimal totalAmount = cart.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<OrderItem> orderItems = cart.getItems().stream()
                .map(item -> OrderItem.builder()
                .productId(item.getProductId())
                .productName(item.getProductName())
                .priceAtPurchase(item.getPrice())
                .quantity(item.getQuantity())
                .sellerId(item.getSellerId())
                .build())
                .collect(Collectors.toList());

        Order order = Order.builder()
                .userId(userId)
                .items(orderItems)
                .totalAmount(totalAmount)
                .status(OrderStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .shippingAddress(request.getShippingAddress())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Order savedOrder = orderRepository.save(order);
        clearCart(token);
        return savedOrder;
    }

    private CartDTO fetchCart(String token) {
        return webClientBuilder.build()
                .get()
                .uri("http://cart-service/api/carts")
                .header("Authorization", token)
                .retrieve()
                .bodyToMono(CartDTO.class)
                .block();
    }

    private void clearCart(String token) {
        webClientBuilder.build()
                .delete()
                .uri("http://cart-service/api/carts/clear")
                .header("Authorization", token)
                .retrieve()
                .toBodilessEntity()
                .block();
    }
}
