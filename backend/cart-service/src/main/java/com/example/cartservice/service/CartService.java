package com.example.cartservice.service;

import com.example.cartservice.dto.CartRequest;
import com.example.cartservice.dto.ProductDTO;
import com.example.cartservice.model.Cart;
import com.example.cartservice.model.CartItem;
import com.example.cartservice.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {

    private final CartRepository cartRepository;
    private final WebClient.Builder webClientBuilder;

    public Cart getCartByUserId(String userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> cartRepository.save(Cart.builder().userId(userId).items(new ArrayList<>()).build()));
    }

    public Cart addToCart(String userId, CartRequest request) {
        log.info("Tentative d'ajout au panier pour l'utilisateur {} : {}", userId, request);

        ProductDTO product = fetchProductDetails(request.getProductId());

        if (product == null) {
            log.error("Produit non trouvé : {}", request.getProductId());
            throw new RuntimeException("Produit non trouvé");
        }

        if (product.getQuantity() < request.getQuantity()) {
            log.warn("Stock insuffisant pour le produit {} : {} requis, {} disponibles",
                    product.getId(), request.getQuantity(), product.getQuantity());
            throw new RuntimeException("Stock insuffisant");
        }

        Cart cart = getCartByUserId(userId);

        Optional<CartItem> existingItem = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(request.getProductId()))
                .findFirst();

        if (existingItem.isPresent()) {
            existingItem.get().setQuantity(existingItem.get().getQuantity() + request.getQuantity());
        } else {
            cart.getItems().add(CartItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .price(product.getPrice())
                    .quantity(request.getQuantity())
                    .sellerId(product.getUserId())
                    .build());
        }

        return cartRepository.save(cart);
    }

    public Cart updateQuantity(String userId, CartRequest request) {
        Cart cart = getCartByUserId(userId);

        CartItem item = cart.getItems().stream()
                .filter(i -> i.getProductId().equals(request.getProductId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Produit non trouvé dans le panier"));

        ProductDTO product = fetchProductDetails(request.getProductId());
        if (product.getQuantity() < request.getQuantity()) {
            throw new RuntimeException("Stock insuffisant");
        }

        item.setQuantity(request.getQuantity());
        return cartRepository.save(cart);
    }

    public Cart removeFromCart(String userId, String productId) {
        Cart cart = getCartByUserId(userId);
        cart.getItems().removeIf(item -> item.getProductId().equals(productId));
        return cartRepository.save(cart);
    }

    public void clearCart(String userId) {
        Cart cart = getCartByUserId(userId);
        cart.getItems().clear();
        cartRepository.save(cart);
    }

    private ProductDTO fetchProductDetails(String productId) {
        log.info("Récupération des détails du produit {} depuis product-service", productId);
        try {
            return webClientBuilder.build()
                    .get()
                    .uri("http://product-service:8082/api/products/" + productId)
                    .retrieve()
                    .bodyToMono(ProductDTO.class)
                    .block();
        } catch (Exception e) {
            log.error("Erreur lors de l'appel au product-service : {}", e.getMessage());
            throw new RuntimeException("Impossible de vérifier le produit : " + e.getMessage());
        }
    }
}
