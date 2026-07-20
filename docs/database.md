# Base de données — buy-02

Ce document décrit le schéma de données de chaque service et explique comment les "relations" fonctionnent alors que chaque service a sa propre base MongoDB isolée.

## 1. Une base MongoDB par service

Chaque service Spring Boot a sa **propre base MongoDB**, avec son propre nom de base, sur la même instance Mongo (un seul conteneur `mongo:6.0`, plusieurs bases logiques dessus) :

| Service | Base | Variable d'env (docker-compose) |
|---|---|---|
| user-service | `userdb` | `SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/userdb` |
| product-service | `productdb` | `SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/productdb` |
| media-service | `mediadb` | `SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/mediadb` |
| order-service | `orderdb` | `SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/orderdb` |
| cart-service | `cartdb` | `SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/cartdb` |

> Note : le fichier `cart-service/src/main/resources/application.yaml` définit un nom de base par défaut différent (`buy01_cart_db`) pour l'exécution locale sans Docker. En pratique, dès que `docker-compose` tourne, la variable d'environnement `SPRING_DATA_MONGODB_URI` a la priorité sur cette valeur par défaut et le service utilise bien `cartdb`, comme les autres. C'est juste un nom de repli local à uniformiser si tu veux nettoyer.

Aucun service n'ouvre de connexion vers la base d'un autre service. Toute donnée dont un service a besoin mais qui appartient à un autre domaine est soit **récupérée par appel HTTP** (voir [architecture.md](./architecture.md#4-comment-les-services-se-parlent-entre-eux)), soit **dupliquée volontairement** au moment où elle est utile (voir section 3).

## 2. Schéma par service

### `userdb.users` (user-service)

| Champ | Type | Note |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String | |
| `email` | String | unique en pratique (vérifié en code, pas d'index unique déclaré) |
| `password` | String | hash BCrypt, jamais le mot de passe en clair |
| `role` | enum `CLIENT` \| `SELLER` | |
| `avatar` | String | présent dans le modèle, pas encore exploité côté frontend |

### `productdb.products` (product-service)

| Champ | Type | Note |
|---|---|---|
| `_id` | ObjectId | |
| `name`, `description` | String | |
| `price` | Double | doit être `> 0` (validé côté contrôleur) |
| `quantity` | Integer | doit être `>= 0`, décrémenté automatiquement quand une commande passe à `PAID` |
| `userId` | String | **référence** vers `userdb.users._id` — c'est le vendeur, aucune contrainte d'intégrité au niveau base (normal en NoSQL / microservices) |
| `sellerName` | String | nom du vendeur **dupliqué** depuis le JWT au moment de la création, pour ne pas avoir à interroger user-service à chaque affichage de la liste produits |
| `imageIds` | List\<String\> | **référence** vers des documents `mediadb.media._id`, ajoutés au fil des uploads |

### `mediadb.media` (media-service)

| Champ | Type | Note |
|---|---|---|
| `_id` | ObjectId | |
| `imagePath` | String | URL publique complète de l'image (`http://.../api/media/file/<uuid>.<ext>`) |
| `productId` | String | **référence** vers `productdb.products._id` |

Les fichiers image eux-mêmes ne sont pas dans MongoDB : ils sont stockés sur disque (dossier `uploads/`, monté en volume Docker), seul le chemin est en base.

### `cartdb.carts` (cart-service)

| Champ | Type | Note |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | String | **`@Indexed(unique = true)`** — un utilisateur ne peut avoir qu'un seul panier, contrainte imposée par un index Mongo, pas juste par la logique applicative |
| `items` | List\<CartItem\> (imbriqué) | |

`CartItem` (sous-document, pas de collection séparée) :

| Champ | Type | Note |
|---|---|---|
| `productId` | String | référence vers `productdb.products._id` |
| `productName` | String | dupliqué depuis product-service au moment de l'ajout au panier |
| `price` | BigDecimal | dupliqué depuis product-service au moment de l'ajout (le prix "vu" par l'utilisateur dans son panier) |
| `quantity` | Integer | |
| `sellerId` | String | dupliqué depuis `product.userId`, utilisé plus tard par order-service pour savoir quel vendeur possède quelle ligne de commande |

### `orderdb.orders` (order-service)

| Champ | Type | Note |
|---|---|---|
| `_id` | ObjectId | |
| `userId` | String | référence vers l'acheteur (`userdb.users._id`) |
| `items` | List\<OrderItem\> (imbriqué) | copie figée du panier au moment du checkout |
| `totalAmount` | BigDecimal | |
| `status` | enum `PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED` | |
| `paymentMethod` | String | ex. `PAY_ON_DELIVERY` |
| `shippingAddress` | String | |
| `createdAt`, `updatedAt` | LocalDateTime | |

`OrderItem` (sous-document) :

| Champ | Type | Note |
|---|---|---|
| `productId` | String | référence vers `productdb.products._id` |
| `productName` | String | figé au moment du checkout |
| `priceAtPurchase` | BigDecimal | **le prix au moment de l'achat**, volontairement distinct du prix courant du produit (si le vendeur change le prix après coup, l'historique de commande ne doit pas changer) |
| `quantity` | Integer | |
| `sellerId` | String | permet à `order-service` de filtrer "quels articles de cette commande appartiennent à tel vendeur" sans rappeler product-service |

## 3. Comment les "relations" sont gérées sans jointure

En SQL classique on ferait une jointure (`orders JOIN products ON ...`). Ici, comme les données sont dans des bases (et des services) différents, deux techniques sont utilisées ensemble :

1. **Référencement par identifiant** — un document garde juste l'`_id` d'un document d'un autre service (`Product.userId`, `Media.productId`, `CartItem.productId`, `OrderItem.productId`...). Pour obtenir le détail, il faut un appel HTTP vers le service propriétaire (ex. le frontend appelle `media-service` avec le `productId` pour récupérer les images d'un produit).

2. **Dénormalisation (duplication volontaire)** — certains champs sont **copiés** dans le document au moment où c'est pertinent, pour éviter un appel réseau à chaque lecture et pour figer une valeur dans le temps :
   - `CartItem.productName` / `price` / `sellerId` : copiés depuis `product-service` quand l'article est ajouté au panier.
   - `OrderItem.productName` / `priceAtPurchase` / `sellerId` : copiés depuis le panier au moment du checkout — **c'est fait exprès** : le prix affiché dans l'historique d'une commande ne doit jamais changer, même si le vendeur modifie le prix du produit après coup.
   - `Product.sellerName` : copié depuis le JWT au moment de la création du produit, pour afficher le nom du vendeur dans la liste produits sans appeler `user-service` à chaque fois.

Le compromis classique de la dénormalisation : ces copies peuvent devenir "périmées" (ex. si un vendeur change son nom, ses produits déjà créés garderont l'ancien `sellerName` jusqu'à la prochaine modification du produit — voir `ProductController.update()`, qui ne réécrit `sellerName` que s'il était vide). C'est un choix assumé, cohérent avec le reste du projet (le prix figé des commandes fonctionne sur le même principe).

## Pour aller plus loin

- [architecture.md](./architecture.md) — qui appelle qui, et les parcours complets
- [security.md](./security.md) — comment les requêtes inter-services sont authentifiées
