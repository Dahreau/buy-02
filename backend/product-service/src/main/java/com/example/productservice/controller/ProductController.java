package com.example.productservice.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.productservice.dto.ProductDTO;
import com.example.productservice.model.Product;
import com.example.productservice.repository.ProductRepository;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductRepository repo;

    private static final String ROLE_SELLER = "ROLE_SELLER";
    private static final String ERROR_KEY = "error";

    public ProductController(ProductRepository repo) {
        this.repo = repo;
    }

    @ExceptionHandler(ControllerException.class)
    public ResponseEntity<Object> handleControllerException(ControllerException ex) {
        return ex.getResponse();
    }

    @GetMapping
    public List<Product> listAll() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getOne(@PathVariable String id) {
        return repo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // create product - only seller
    @PostMapping
    public ResponseEntity<Object> create(@RequestBody ProductDTO dto) {
        String userId = validateSeller("Only sellers can create products");
        Product p = new Product();
        p.setName(dto.getName());
        p.setDescription(dto.getDescription());
        p.setPrice(dto.getPrice());
        p.setQuantity(dto.getQuantity());
        p.setImageIds(dto.getImageIds());
        p.setUserId(userId);
        Product saved = repo.save(p);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable String id, @RequestBody ProductDTO dto) {
        String userId = validateSeller("Only sellers can update products");
        Product existing = validateOwnership(id, userId, "Cannot modify another seller's product");
        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setPrice(dto.getPrice());
        existing.setQuantity(dto.getQuantity());
        existing.setImageIds(dto.getImageIds());
        repo.save(existing);
        return ResponseEntity.ok(existing);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable String id) {
        String userId = validateSeller("Only sellers can delete products");
        validateOwnership(id, userId, "Cannot delete another seller's product");
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Internal endpoint to append an image/media id to a product's imageIds list.
    // This endpoint expects an internal token in the X-Internal-Token header and is
    // intended for trusted services (e.g., media-service) to keep data in sync.
    @PostMapping("/{id}/images")
    public ResponseEntity<Object> addImage(@PathVariable String id, @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-Internal-Token", required = false) String token) {
        String internalToken = System.getenv("INTERNAL_TOKEN");
        if (internalToken == null || !internalToken.equals(token)) {
            return ResponseEntity.status(403).body(Map.of(ERROR_KEY, "Forbidden"));
        }
        var opt = repo.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Product product = opt.get();
        String mediaId = body.get("mediaId");
        if (mediaId == null || mediaId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(ERROR_KEY, "mediaId required"));
        }
        List<String> imgs = product.getImageIds();
        if (imgs == null) {
            imgs = new ArrayList<>();
        }
        imgs.add(mediaId);
        product.setImageIds(imgs);
        repo.save(product);
        return ResponseEntity.ok(product);
    }

    private String validateSeller(String errorMsg) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equalsIgnoreCase(ROLE_SELLER))) {
            throw new ControllerException(ResponseEntity.status(403).body(Map.of(ERROR_KEY, errorMsg)));
        }
        return auth.getName();
    }

    private Product validateOwnership(String id, String userId, String errorMsg) {
        var opt = repo.findById(id);
        if (opt.isEmpty()) {
            throw new ControllerException(ResponseEntity.notFound().build());
        }
        Product existing = opt.get();
        if (!userId.equals(existing.getUserId())) {
            throw new ControllerException(ResponseEntity.status(403).body(Map.of(ERROR_KEY, errorMsg)));
        }
        return existing;
    }

    public static class ControllerException extends RuntimeException {

        private final transient ResponseEntity<Object> response;

        public ControllerException(ResponseEntity<Object> response) {
            this.response = response;
        }

        public ResponseEntity<Object> getResponse() {
            return response;
        }
    }
}
