package com.example.orderservice.controller;

import java.math.BigDecimal;
import java.security.Key;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import com.example.orderservice.dto.CartDTO;
import com.example.orderservice.dto.CartItemDTO;
import com.example.orderservice.dto.CheckoutRequest;
import com.example.orderservice.dto.UserStatsDTO;
import com.example.orderservice.model.Order;
import com.example.orderservice.model.OrderStatus;
import com.example.orderservice.repository.OrderRepository;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import reactor.core.publisher.Mono;

@ActiveProfiles("test")
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerTest {

    @Autowired
    private OrderController orderController;

    @Autowired
    private OrderRepository orderRepository;

    @MockitoBean
    private WebClient.Builder webClientBuilder;

    @MockitoBean
    private WebClient webClient;

    @MockitoBean
    @SuppressWarnings("rawtypes")
    private WebClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @MockitoBean
    @SuppressWarnings("rawtypes")
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @MockitoBean
    private WebClient.ResponseSpec responseSpec;

    @Value("${jwt.secret}")
    private String jwtSecret;

    // Générateur de token valide pour bypasser la sécurité proprement
    private String createValidToken(String id, String role) {
        Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        return "Bearer " + Jwts.builder()
                .claim("id", id)
                .claim("role", role)
                .signWith(key)
                .compact();
    }

    @BeforeEach
    @SuppressWarnings("unused")
    void setUp() {
        orderRepository.deleteAll();
    }

    @Test
    @SuppressWarnings("unchecked")
    void checkoutValidCartShouldCreateOrderAndReturn200() {
        // On génère un vrai JWT pour un USER
        String token = createValidToken("user123", "USER");

        CartItemDTO item = new CartItemDTO();
        item.setProductId("prod123");
        item.setProductName("Product Test");
        item.setPrice(BigDecimal.valueOf(100));
        item.setQuantity(2);
        item.setSellerId("seller456");

        CartDTO dummyCart = new CartDTO();
        dummyCart.setUserId("user123");
        dummyCart.setItems(List.of(item));

        when(webClientBuilder.build()).thenReturn(webClient);
        when(webClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.bodyToMono(CartDTO.class)).thenReturn(Mono.just(dummyCart));

        CheckoutRequest checkoutRequest = new CheckoutRequest();
        checkoutRequest.setShippingAddress("123 Street, Rouen");
        checkoutRequest.setPaymentMethod("PAY_ON_DELIVERY");

        Order response = orderController.checkout(token, checkoutRequest);

        assertNotNull(response);
        assertEquals(OrderStatus.PENDING, response.getStatus());
        assertEquals(BigDecimal.valueOf(200), response.getTotalAmount());
        assertEquals("123 Street, Rouen", response.getShippingAddress());

        List<Order> savedOrders = orderRepository.findAll();
        assertEquals(1, savedOrders.size());
    }

    @Test
    void getUserStatsShouldReturnEmptyStatsWhenNoOrdersExist() {
        String token = createValidToken("user123", "USER");

        UserStatsDTO stats = orderController.getMyStats(token);

        assertNotNull(stats);
        assertEquals(BigDecimal.ZERO, stats.getTotalSpent());
        assertEquals(0, stats.getTotalOrders());
        assertNotNull(stats.getTopProducts());
    }

    @Test
    void getSellerStatsShouldThrowForbiddenWhenUserIsNotSeller() {
        // On génère un JWT avec le rôle CLIENT pour tester le rejet
        String token = createValidToken("client123", "CLIENT");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> {
            orderController.getSellerStats(token);
        });

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
        assertEquals("Accès réservé aux vendeurs", exception.getReason());
    }
}