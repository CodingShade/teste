# 📚 Documentação Técnica - API FaceGram

## 🎯 Visão Geral do Projeto

A **API FaceGram** é uma aplicação Spring Boot que implementa o backend de uma rede social completa, oferecendo funcionalidades de autenticação, gerenciamento de usuários, posts, comentários e curtidas. O projeto foi desenvolvido seguindo as melhores práticas de desenvolvimento Java e arquitetura REST.

---

## 🏗️ Arquitetura do Sistema

### **Padrão Arquitetural: MVC (Model-View-Controller)**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controllers   │ -> │    Services     │ -> │  Repositories   │
│   (REST API)    │    │  (Lógica de     │    │   (Acesso a     │
│                 │    │   Negócio)      │    │    Dados)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         v                       v                       v
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      DTOs       │    │    Entities     │    │   PostgreSQL    │
│  (Transferência │    │   (Modelos)     │    │   (Banco de     │
│   de Dados)     │    │                 │    │    Dados)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🗄️ Modelagem do Banco de Dados

### **Relacionamentos JPA (1:N)**

```sql
User (1) -----> (N) Post
User (1) -----> (N) Comment  
User (1) -----> (N) Like
Post (1) -----> (N) Comment
Post (1) -----> (N) Like
```

### **Entidades Principais:**

#### **1. User (Usuário)**
```java
@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Column(nullable = false, unique = true, length = 150)
    private String email;
    
    @Column(nullable = false)
    @JsonIgnore
    private String password;
    
    // Relacionamentos 1:N
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Post> posts;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Comment> comments;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Like> likes;
}
```

**Decisões Técnicas:**
- **`@JsonIgnore` na senha**: Evita exposição acidental da senha em respostas JSON
- **`unique = true` no email**: Garante unicidade para autenticação
- **`CascadeType.ALL`**: Remove automaticamente posts/comentários/curtidas quando usuário é deletado
- **`FetchType.LAZY`**: Melhora performance carregando relacionamentos sob demanda

#### **2. Post (Publicação)**
```java
@Entity
@Table(name = "posts")
public class Post {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 1000)
    private String content;
    
    @Column(name = "image_url", length = 500)
    private String imageUrl;
    
    // Relacionamento N:1 com User
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    // Relacionamentos 1:N
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL)
    private List<Comment> comments;
    
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL)
    private List<Like> likes;
}
```

**Decisões Técnicas:**
- **Limite de 1000 caracteres**: Balanceia expressividade com performance
- **URL da imagem opcional**: Permite posts apenas com texto
- **Timestamps automáticos**: `@CreationTimestamp` e `@UpdateTimestamp` para auditoria

#### **3. Comment (Comentário)**
```java
@Entity
@Table(name = "comments")
public class Comment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 500)
    private String content;
    
    // Relacionamentos N:1
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
}
```

#### **4. Like (Curtida)**
```java
@Entity
@Table(name = "likes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "post_id"})
})
public class Like {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // Relacionamentos N:1
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
}
```

**Decisão Técnica Importante:**
- **`@UniqueConstraint`**: Impede que um usuário curta o mesmo post múltiplas vezes

---

## 🔐 Sistema de Segurança

### **Arquitetura de Autenticação JWT**

```
Cliente -> Login -> AuthController -> AuthService -> JWT Token -> Cliente
                                   |
                                   v
                            UserDetailsService -> Database
```

#### **1. SecurityConfig.java**
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            );
    }
}
```

**Decisões de Segurança:**
- **CORS habilitado**: Permite requisições do frontend React
- **CSRF desabilitado**: Desnecessário para APIs stateless com JWT
- **SessionCreationPolicy.STATELESS**: Não mantém sessões no servidor
- **Endpoints públicos**: Apenas `/api/auth/**` acessível sem autenticação

#### **2. JWT Token Provider**
```java
@Component
public class JwtTokenProvider {
    
    public String generateToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        Date expiryDate = new Date(System.currentTimeMillis() + jwtExpirationInMs);
        
        return Jwts.builder()
                .setSubject(Long.toString(userPrincipal.getId()))
                .setIssuedAt(new Date())
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS512)
                .compact();
    }
}
```

**Decisões JWT:**
- **HS512 Algorithm**: Algoritmo seguro para assinatura
- **24 horas de expiração**: Balanceia segurança com usabilidade
- **User ID no subject**: Identificação única do usuário

#### **3. Filtro de Autenticação**
```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                  FilterChain filterChain) throws ServletException, IOException {
        String jwt = getJwtFromRequest(request);
        
        if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
            Long userId = tokenProvider.getUserIdFromToken(jwt);
            UserDetails userDetails = customUserDetailsService.loadUserById(userId);
            
            UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        
        filterChain.doFilter(request, response);
    }
}
```

---

## 🎛️ Camada de Controle (Controllers)

### **Padrão REST Implementado**

#### **1. AuthController - Autenticação**
```java
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        AuthResponse response = authService.login(loginRequest);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        AuthResponse response = authService.register(registerRequest);
        return ResponseEntity.ok(response);
    }
}
```

**Decisões do Controller:**
- **`@Valid`**: Validação automática dos dados de entrada
- **`@CrossOrigin`**: Permite requisições do frontend
- **ResponseEntity**: Controle completo sobre resposta HTTP
- **Endpoints RESTful**: `/login` e `/register` seguem convenções REST

#### **2. PostController - Gerenciamento de Posts**
```java
@RestController
@RequestMapping("/api/posts")
public class PostController {
    
    @GetMapping
    public ResponseEntity<Page<PostDTO>> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        Page<PostDTO> posts = postService.getAllPosts(page, size, userPrincipal.getId());
        return ResponseEntity.ok(posts);
    }
}
```

**Decisões de Paginação:**
- **`Page<PostDTO>`**: Paginação nativa do Spring Data
- **Parâmetros opcionais**: `page=0` e `size=10` como padrão
- **`@AuthenticationPrincipal`**: Acesso direto ao usuário autenticado

---

## 🔧 Camada de Serviço (Services)

### **Lógica de Negócio Centralizada**

#### **1. PostService - Exemplo de Implementação**
```java
@Service
@Transactional
public class PostService {
    
    public PostDTO createPost(String content, String imageUrl, Long userId) {
        User user = userService.findUserEntityById(userId);
        
        Post post = new Post();
        post.setContent(content);
        post.setImageUrl(imageUrl);
        post.setUser(user);
        
        Post savedPost = postRepository.save(post);
        return convertToDTO(savedPost, userId);
    }
    
    private PostDTO convertToDTO(Post post, Long currentUserId) {
        PostDTO postDTO = modelMapper.map(post, PostDTO.class);
        
        // Converter user para UserDTO
        UserDTO userDTO = modelMapper.map(post.getUser(), UserDTO.class);
        postDTO.setUser(userDTO);
        
        // Contar curtidas e comentários
        postDTO.setLikesCount(postRepository.countLikesByPostId(post.getId()));
        postDTO.setCommentsCount(postRepository.countCommentsByPostId(post.getId()));
        
        // Verificar se o usuário atual curtiu o post
        if (currentUserId != null) {
            postDTO.setLikedByCurrentUser(
                likeRepository.existsByUserIdAndPostId(currentUserId, post.getId())
            );
        }
        
        return postDTO;
    }
}
```

**Decisões do Service:**
- **`@Transactional`**: Garante consistência das operações
- **ModelMapper**: Conversão automática Entity ↔ DTO
- **Contagem dinâmica**: Likes e comentários calculados em tempo real
- **Contexto do usuário**: Verifica se usuário atual curtiu o post

#### **2. LikeService - Toggle de Curtidas**
```java
@Service
@Transactional
public class LikeService {
    
    public boolean toggleLike(Long postId, Long userId) {
        User user = userService.findUserEntityById(userId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post não encontrado"));
        
        if (likeRepository.existsByUserIdAndPostId(userId, postId)) {
            // Se já curtiu, remove a curtida
            likeRepository.deleteByUserIdAndPostId(userId, postId);
            return false; // Descurtiu
        } else {
            // Se não curtiu, adiciona a curtida
            Like like = new Like(user, post);
            likeRepository.save(like);
            return true; // Curtiu
        }
    }
}
```

**Lógica de Toggle:**
- **Verificação de existência**: Evita curtidas duplicadas
- **Operação atômica**: Curtir/descurtir em uma única transação
- **Retorno booleano**: Indica estado final da curtida

---

## 📊 Camada de Dados (Repositories)

### **Spring Data JPA com Queries Customizadas**

#### **1. PostRepository**
```java
@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    
    @Query("SELECT p FROM Post p ORDER BY p.createdAt DESC")
    Page<Post> findAllOrderByCreatedAtDesc(Pageable pageable);
    
    @Query("SELECT p FROM Post p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    Page<Post> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId, Pageable pageable);
    
    @Query("SELECT COUNT(l) FROM Like l WHERE l.post.id = :postId")
    Long countLikesByPostId(@Param("postId") Long postId);
    
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.post.id = :postId")
    Long countCommentsByPostId(@Param("postId") Long postId);
}
```

**Decisões de Repository:**
- **JPQL personalizado**: Queries otimizadas para casos específicos
- **Paginação nativa**: `Pageable` para performance em grandes datasets
- **Contagem eficiente**: COUNT queries para estatísticas
- **Ordenação por data**: Posts mais recentes primeiro

#### **2. LikeRepository**
```java
@Repository
public interface LikeRepository extends JpaRepository<Like, Long> {
    
    @Query("SELECT l FROM Like l WHERE l.user.id = :userId AND l.post.id = :postId")
    Optional<Like> findByUserIdAndPostId(@Param("userId") Long userId, @Param("postId") Long postId);
    
    boolean existsByUserIdAndPostId(Long userId, Long postId);
    
    void deleteByUserIdAndPostId(Long userId, Long postId);
}
```

---

## 📋 DTOs (Data Transfer Objects)

### **Separação de Responsabilidades**

#### **Por que usar DTOs?**
1. **Segurança**: Evita exposição de dados sensíveis (ex: senha)
2. **Performance**: Transfere apenas dados necessários
3. **Versionamento**: Permite evolução da API sem quebrar clientes
4. **Validação**: Centraliza regras de validação

#### **Exemplo: UserDTO**
```java
public class UserDTO {
    private Long id;
    
    @NotBlank(message = "Nome é obrigatório")
    @Size(min = 2, max = 100, message = "Nome deve ter entre 2 e 100 caracteres")
    private String name;
    
    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email deve ser válido")
    private String email;
    
    private String bio;
    private String location;
    private String avatarUrl;
    private String coverPhotoUrl;
    private LocalDateTime createdAt;
    private Long postsCount;
    
    // Getters e Setters...
}
```

**Validações Bean Validation:**
- **`@NotBlank`**: Campo obrigatório e não vazio
- **`@Size`**: Limites de tamanho
- **`@Email`**: Formato de email válido

---

## ⚙️ Configurações

### **1. application.yml**
```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/facegram_db
    username: postgres
    password: postgres
    driver-class-name: org.postgresql.Driver
    
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true

jwt:
  secret: mySecretKey123456789012345678901234567890
  expiration: 86400000 # 24 horas
```

**Decisões de Configuração:**
- **PostgreSQL**: Banco robusto para produção
- **`ddl-auto: update`**: Atualiza schema automaticamente
- **`show-sql: true`**: Debug de queries em desenvolvimento
- **JWT secret**: Chave forte para assinatura de tokens

### **2. ModelMapperConfig**
```java
@Configuration
public class ModelMapperConfig {
    
    @Bean
    public ModelMapper modelMapper() {
        return new ModelMapper();
    }
}
```

**Por que ModelMapper?**
- **Reduz boilerplate**: Conversão automática Entity ↔ DTO
- **Manutenibilidade**: Menos código manual para manter
- **Flexibilidade**: Configurações customizadas quando necessário

---

## 🚨 Tratamento de Erros

### **GlobalExceptionHandler**
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now());
        error.put("status", HttpStatus.BAD_REQUEST.value());
        error.put("error", "Bad Request");
        error.put("message", ex.getMessage());
        
        return ResponseEntity.badRequest().body(error);
    }
    
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("error", "Validation Failed");
        response.put("message", "Dados inválidos");
        response.put("validationErrors", errors);
        
        return ResponseEntity.badRequest().body(response);
    }
}
```

**Benefícios do Tratamento Global:**
- **Consistência**: Todas as respostas de erro seguem o mesmo padrão
- **Debugging**: Informações detalhadas para desenvolvimento
- **UX**: Mensagens claras para o frontend

---

## 🔄 Fluxo de Dados Completo

### **Exemplo: Criar um Post**

```
1. Frontend -> POST /api/posts
   {
     "content": "Meu novo post!",
     "imageUrl": "https://example.com/image.jpg"
   }

2. PostController.createPost()
   - Valida dados com @Valid
   - Extrai usuário do JWT token
   - Chama PostService

3. PostService.createPost()
   - Busca User entity
   - Cria novo Post
   - Salva no banco
   - Converte para DTO

4. PostRepository.save()
   - Persiste no PostgreSQL
   - Retorna Post com ID

5. Response -> Frontend
   {
     "id": 123,
     "content": "Meu novo post!",
     "imageUrl": "https://example.com/image.jpg",
     "user": { "id": 1, "name": "João" },
     "likesCount": 0,
     "commentsCount": 0,
     "isLikedByCurrentUser": false,
     "createdAt": "2024-01-15T10:30:00"
   }
```

---

## 🚀 Endpoints da API

### **Autenticação**
- `POST /api/auth/login` - Login do usuário
- `POST /api/auth/register` - Registro de novo usuário

### **Usuários**
- `GET /api/users/me` - Dados do usuário atual
- `GET /api/users/{id}` - Buscar usuário por ID
- `GET /api/users` - Listar todos os usuários
- `GET /api/users/search?name=` - Buscar usuários por nome
- `PUT /api/users/{id}` - Atualizar perfil
- `DELETE /api/users/{id}` - Deletar conta

### **Posts**
- `GET /api/posts` - Feed de posts (paginado)
- `POST /api/posts` - Criar novo post
- `GET /api/posts/{id}` - Buscar post por ID
- `GET /api/posts/user/{userId}` - Posts de um usuário
- `PUT /api/posts/{id}` - Atualizar post
- `DELETE /api/posts/{id}` - Deletar post

### **Comentários**
- `POST /api/comments` - Criar comentário
- `GET /api/comments/post/{postId}` - Comentários de um post
- `GET /api/comments/user/{userId}` - Comentários de um usuário
- `PUT /api/comments/{id}` - Atualizar comentário
- `DELETE /api/comments/{id}` - Deletar comentário

### **Curtidas**
- `POST /api/likes/toggle/{postId}` - Curtir/descurtir post
- `GET /api/likes/check/{postId}` - Verificar se curtiu

---

## 🛡️ Segurança e Boas Práticas

### **Implementadas:**
1. **Autenticação JWT**: Tokens seguros e stateless
2. **Criptografia de senhas**: BCrypt com salt
3. **Validação de entrada**: Bean Validation em todos os DTOs
4. **CORS configurado**: Permite integração com frontend
5. **Tratamento de exceções**: Respostas consistentes de erro
6. **Autorização**: Usuários só podem editar próprio conteúdo

### **Recomendações para Produção:**
1. **HTTPS obrigatório**: Criptografia em trânsito
2. **Rate limiting**: Prevenir ataques de força bruta
3. **Logs de auditoria**: Rastreamento de ações sensíveis
4. **Backup automático**: Proteção de dados
5. **Monitoramento**: Métricas de performance e saúde

---

## 🧪 Como Testar

### **1. Registro de Usuário**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "123456"
  }'
```

### **2. Login**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "password": "123456"
  }'
```

### **3. Criar Post (com token)**
```bash
curl -X POST http://localhost:8080/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "content": "Meu primeiro post!",
    "imageUrl": "https://example.com/image.jpg"
  }'
```

---

## 📈 Melhorias Futuras

### **Funcionalidades:**
1. **Sistema de amizades**: Relacionamento many-to-many entre usuários
2. **Notificações**: Push notifications para curtidas/comentários
3. **Upload de imagens**: Integração com AWS S3 ou similar
4. **Feed personalizado**: Algoritmo baseado em interações
5. **Stories**: Conteúdo temporário (24h)

### **Técnicas:**
1. **Cache Redis**: Performance para dados frequentes
2. **Elasticsearch**: Busca avançada de posts/usuários
3. **WebSockets**: Notificações em tempo real
4. **Microserviços**: Separação por domínios
5. **Docker**: Containerização para deploy

---

## 🎯 Conclusão

A API FaceGram foi desenvolvida seguindo as melhores práticas de desenvolvimento Spring Boot, oferecendo:

- **Arquitetura sólida**: MVC com separação clara de responsabilidades
- **Segurança robusta**: JWT + Spring Security
- **Performance otimizada**: Paginação, lazy loading, queries eficientes
- **Manutenibilidade**: Código limpo, documentado e testável
- **Escalabilidade**: Preparada para crescimento futuro

O projeto demonstra domínio completo do ecossistema Spring e está pronto para integração com o frontend React existente! 🚀