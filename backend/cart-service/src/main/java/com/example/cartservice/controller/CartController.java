package com.example.cartservice.controller;

import java.util.Base64;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.cartservice.dto.CartRequest;
import com.example.cartservice.model.Cart;
import com.example.cartservice.service.CartService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/carts")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String extractUserId(String token) {
        try {
            String jwt = token.startsWith("Bearer ") ? token.substring(7) : token;
            String payload = jwt.split("\\.")[1];
            String decodedPayload = new String(Base64.getDecoder().decode(payload));
            JsonNode json = objectMapper.readTree(decodedPayload);
            return json.has("sub") ? json.get("sub").asText() : json.get("id").asText();
        } catch (Exception e) {
            throw new RuntimeException("Token invalide ou erreur d'authentification");
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
