package com.example.cartservice.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.example.cartservice.dto.CartRequest;
import com.example.cartservice.model.Cart;
import com.example.cartservice.service.CartService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/carts")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    @org.springframework.beans.factory.annotation.Value("${jwt.secret}")
    private String jwtSecret;

    private String extractUserId(String token) {
        try {
            String jwt = token.startsWith("Bearer ") ? token.substring(7) : token;
            io.jsonwebtoken.Claims claims = io.jsonwebtoken.Jwts.parserBuilder()
                    .setSigningKey(io.jsonwebtoken.security.Keys.hmacShaKeyFor(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                    .build()
                    .parseClaimsJws(jwt)
                    .getBody();

            return claims.getSubject();
        } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalide ou forgé", e);
        }
    }

    @GetMapping
    public Cart getCart(@RequestHeader("Authorization") String token) {
        String userId = extractUserId(token);
        return cartService.getCartByUserId(userId);
    }

    @PostMapping
    public Cart addToCart(@RequestHeader("Authorization") String token, @RequestBody @Valid CartRequest request) {
        String userId = extractUserId(token);
        return cartService.addToCart(userId, request);
    }

    @PutMapping
    public Cart updateQuantity(@RequestHeader("Authorization") String token, @RequestBody @Valid CartRequest request) {
        String userId = extractUserId(token);
        return cartService.updateQuantity(userId, request);
    }

    @DeleteMapping("/{productId}")
    public Cart removeFromCart(@RequestHeader("Authorization") String token, @PathVariable String productId) {
        String userId = extractUserId(token);
        return cartService.removeFromCart(userId, productId);
    }

    @DeleteMapping("/clear")
    public void clearCart(@RequestHeader("Authorization") String token) {
        String userId = extractUserId(token);
        cartService.clearCart(userId);
    }
}
