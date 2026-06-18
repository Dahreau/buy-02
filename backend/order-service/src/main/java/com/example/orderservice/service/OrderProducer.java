package com.example.orderservice.service;

import com.example.orderservice.dto.StockUpdateEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderProducer {

    private final WebClient.Builder webClientBuilder;

    public void sendStockUpdate(String productId, Integer quantity) {
        log.info("Envoi mise à jour stock pour le produit {} : -{}", productId, quantity);
        webClientBuilder.build()
                .post()
                .uri("http://product-service/api/products/stock-update")
                .bodyValue(new StockUpdateEvent(productId, quantity))
                .retrieve()
                .toBodilessEntity()
                .block();
    }
}
