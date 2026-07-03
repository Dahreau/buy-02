package com.example.orderservice.controller;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.orderservice.dto.CheckoutRequest;
import com.example.orderservice.dto.SellerStatsDTO;
import com.example.orderservice.dto.UserStatsDTO;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderStatus;
import com.example.orderservice.service.OrderService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor

public class OrderController {

    @org.springframework.beans.factory.annotation.Value("${jwt.secret}")
    private String jwtSecret;

    private final OrderService orderService;
    private static final String SELLER = "SELLER";
    private static final String ERRORS = "Accès réservé aux vendeurs";

    private String getClaim(String token, String claim) {
        try {
            String jwt = token.startsWith("Bearer ") ? token.substring(7) : token;
            io.jsonwebtoken.Claims claims = io.jsonwebtoken.Jwts.parserBuilder()
                    .setSigningKey(io.jsonwebtoken.security.Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                    .build()
                    .parseClaimsJws(jwt)
                    .getBody();

            if ("id".equals(claim) || "sub".equals(claim)) {
                return claims.getSubject();
            }
            return claims.get(claim, String.class);
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalide", e);
        }
    }

    @GetMapping("/stats/user")
    public UserStatsDTO getMyStats(@RequestHeader("Authorization") String token) {
        String userId = getClaim(token, "id");
        return orderService.getUserStats(userId);
    }

    @GetMapping("/stats/seller")
    public SellerStatsDTO getSellerStats(@RequestHeader("Authorization") String token) {
        String role = getClaim(token, "role");
        if (!SELLER.equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ERRORS);
        }
        String sellerId = getClaim(token, "id");
        return orderService.getSellerStats(sellerId);
    }

    @GetMapping
    public Page<Order> getMyOrders(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        if (start != null && end != null && start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de début doit être antérieure à la date de fin");
        }

        String userId = getClaim(token, "id");
        return orderService.searchOrders(userId, null, status, start, end, keyword, PageRequest.of(page, size));
    }

    @GetMapping("/seller")
    public Page<Order> getSellerOrders(
            @RequestHeader("Authorization") String token,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        if (start != null && end != null && start.isAfter(end)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date de début doit être antérieure à la date de fin");
        }

        String role = getClaim(token, "role");
        if (!SELLER.equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ERRORS);
        }
        String sellerId = getClaim(token, "id");
        return orderService.searchOrders(null, sellerId, status, start, end, keyword, PageRequest.of(page, size));
    }

    @PostMapping("/{id}/cancel")
    public Order cancelOrder(@RequestHeader("Authorization") String token, @PathVariable String id) {
        String userId = getClaim(token, "id");
        return orderService.cancelOrder(userId, id);
    }

    @PutMapping("/{id}/status")
    public Order updateOrderStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable String id,
            @RequestParam OrderStatus status) {
        String role = getClaim(token, "role");
        if (!SELLER.equals(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, ERRORS);
        }
        String sellerId = getClaim(token, "id");
        return orderService.updateOrderStatus(sellerId, id, status);
    }

    @DeleteMapping("/{id}")
    public void deleteOrder(@RequestHeader("Authorization") String token, @PathVariable String id) {
        String userId = getClaim(token, "id");
        orderService.deleteOrder(userId, id);
    }

    @PostMapping("/{id}/redo")
    public Order redoOrder(@RequestHeader("Authorization") String token, @PathVariable String id) {
        String userId = getClaim(token, "id");
        return orderService.redoOrder(userId, id, token);
    }

    @PostMapping("/checkout")
    public Order checkout(@RequestHeader("Authorization") String token, @RequestBody @Valid CheckoutRequest request) {
        String userId = getClaim(token, "id");
        return orderService.checkout(userId, request, token);
    }
}
