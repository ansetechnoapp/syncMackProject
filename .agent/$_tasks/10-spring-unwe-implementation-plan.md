# 🚀 Spring Services - Unified Notification & Workflow Engine (UNWE)

## 📋 Sommaire

1. [Vision & Objectifs](#vision--objectifs)
2. [Architecture Globale](#architecture-globale)
3. [Flux de Communication](#flux-de-communication)
4. [Stack Technique](#stack-technique)
5. [Structure du Projet](#structure-du-projet)
6. [Plan d'Implémentation Détaillé](#plan-dimplémentation-détaillé)
7. [Contrats d'API](#contrats-dapi)
8. [Templates de Notification](#templates-de-notification)
9. [Workflows Business](#workflows-business)
10. [Tests & Validation](#tests--validation)
11. [Déploiement](#déploiement)

---

## 🎯 Vision & Objectifs

### Mission

**Spring Services** devient le **Hub Central de Communication** de la plateforme ZodBack, orchestrant toutes les notifications et workflows multi-étapes entre les services.

### Problèmes Résolus

| Problème Actuel | Solution UNWE |
|-----------------|---------------|
| Notifications dispersées dans NestJS | Centralisation dans Spring |
| Pas de workflow multi-étapes | Workflow Engine avec état persistant |
| Pas d'intégration NestJS ↔ Python | Spring comme pont de communication |
| Templates email en dur | Thymeleaf avec i18n et versioning |
| Pas de notifications push | Firebase Admin SDK intégré |

### Objectifs Mesurables

- [ ] 100% des événements NestJS routés vers Spring
- [ ] 5 workflows business implémentés
- [ ] 4 canaux de notification (Email, SMS, Push, Slack)
- [ ] Latence < 500ms pour le traitement d'événements
- [ ] 99.9% de fiabilité avec retry automatique

---

## 🏗 Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                   ZODBACK PLATFORM                                   │
├────────────────────────┬──────────────────────────────┬─────────────────────────────┤
│       NestJS           │       Spring UNWE            │       Python Services       │
│      (CORE API)        │   (NOTIFICATION HUB)         │      (ANALYTICS)            │
│      Port 3013         │      Port 3020               │      Port 8012              │
├────────────────────────┼──────────────────────────────┼─────────────────────────────┤
│                        │                              │                             │
│  ┌──────────────────┐  │  ┌────────────────────────┐  │  ┌───────────────────────┐  │
│  │ Auth Module      │  │  │ Event Consumer         │  │  │ Analytics Calculator  │  │
│  │ Users Module     │──┼─▶│ Notification Router    │──┼─▶│ Report Generator      │  │
│  │ Payments Module  │  │  │ Workflow Engine        │  │  │ Background Workers    │  │
│  │ E-commerce       │  │  │ Template Renderer      │  │  │                       │  │
│  │ E-learning       │  │  │ Scheduler              │  │  │                       │  │
│  │ Events Bus       │  │  └────────────────────────┘  │  └───────────────────────┘  │
│  └──────────────────┘  │              │               │             ▲               │
│                        │              ▼               │             │               │
│                        │  ┌────────────────────────┐  │             │               │
│                        │  │ External Integrations  │  │             │               │
│                        │  │ • SendGrid (Email)     │  │  HTTP Calls │               │
│                        │  │ • Twilio (SMS)         │◀─┼─────────────┘               │
│                        │  │ • Firebase (Push)      │  │                             │
│                        │  │ • Slack Webhooks       │  │                             │
│                        │  └────────────────────────┘  │                             │
└────────────────────────┴──────────────────────────────┴─────────────────────────────┘
```

### Responsabilités par Service

| Service | Responsabilité | Ne Fait PAS |
|---------|----------------|-------------|
| **NestJS** | CRUD, Auth, Business Logic, Event Publishing | Envoi d'emails, Notifications push |
| **Spring** | Notifications, Workflows, Scheduling, Integration | Logique métier core, Auth |
| **Python** | Analytics, Reports, Heavy computing | Notifications, CRUD |

---

## 🔄 Flux de Communication

### Flux 1: Paiement Réussi

```
┌─────────┐    Event HTTP POST    ┌─────────────┐
│ NestJS  │ ──────────────────────▶ Spring UNWE │
│Payments │  payment.succeeded    │             │
└─────────┘                        └──────┬──────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
           ┌────────────────┐    ┌────────────────┐    ┌────────────────┐
           │ Email Service  │    │ Python Client  │    │ Audit Logger   │
           │ Send Receipt   │    │ Update MRR     │    │ Log Event      │
           └────────────────┘    └────────────────┘    └────────────────┘
```

**Détail du flux:**

1. `PaymentsService` (NestJS) complète une transaction
2. `EventBusService` émet `payment.transaction.succeeded`
3. `SpringIntegrationService` forward l'événement vers Spring (port 3020)
4. Spring `EventsController` reçoit l'événement
5. `PaymentEventHandler` traite l'événement:
   - Récupère le template email `payment-receipt.html`
   - Génère le HTML avec les données de paiement
   - Appelle `EmailService.send()`
6. Parallèlement, `PythonClient` appelle `/internal/analytics/recompute`
7. Python recalcule le MRR et met à jour les dashboards

### Flux 2: Inscription Utilisateur → Workflow Onboarding

```
┌─────────┐                  ┌─────────────┐                 ┌──────────────┐
│ NestJS  │  user.registered │ Spring UNWE │                 │   Scheduler  │
│  Auth   │ ─────────────────▶   Workflow  │ ───────────────▶│   (Quartz)   │
└─────────┘                  │   Engine    │  Schedule Jobs  └──────────────┘
                             └─────────────┘                        │
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    │
           ┌────────┴────────┐      ┌────────────────┐      ┌────────────────┐
           │  Day 0          │      │  Day 3         │      │  Day 7         │
           │  Welcome Email  │ ───▶ │  Tips Email    │ ───▶ │  Review Request│
           └─────────────────┘      └────────────────┘      └────────────────┘
```

### Flux 3: Cours Terminé → Certificat

```
┌─────────┐                  ┌─────────────┐
│ NestJS  │ course.completed │ Spring UNWE │
│E-learning│ ────────────────▶             │
└─────────┘                  └──────┬──────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           ┌────────────────┐              ┌────────────────┐
           │ Certificate    │              │ Email Service  │
           │ Generator      │              │ Congratulations│
           │ (PDF Thymeleaf)│              │ + Download Link│
           └────────────────┘              └────────────────┘
                    │
                    ▼
           ┌────────────────┐
           │ Python Client  │
           │ Update Learner │
           │ Analytics      │
           └────────────────┘
```

---

## 🛠 Stack Technique

### Dépendances Maven (pom.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.1</version>
    </parent>
    
    <groupId>com.zodback</groupId>
    <artifactId>spring-services</artifactId>
    <version>0.1.0-SNAPSHOT</version>
    <name>Spring UNWE</name>
    <description>Unified Notification & Workflow Engine for ZodBack</description>
    
    <properties>
        <java.version>21</java.version>
    </properties>
    
    <dependencies>
        <!-- Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <!-- Email -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>
        
        <!-- Templates -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
        </dependency>
        
        <!-- Scheduling -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-quartz</artifactId>
        </dependency>
        
        <!-- HTTP Client (pour appels Python/NestJS) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        
        <!-- Database (pour workflows state) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        
        <!-- Firebase Push Notifications -->
        <dependency>
            <groupId>com.google.firebase</groupId>
            <artifactId>firebase-admin</artifactId>
            <version>9.2.0</version>
        </dependency>
        
        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        
        <!-- Retry & Resilience -->
        <dependency>
            <groupId>org.springframework.retry</groupId>
            <artifactId>spring-retry</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-aop</artifactId>
        </dependency>
        
        <!-- Lombok (optionnel) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        
        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

### Configuration (application.properties)

```properties
# Server
spring.application.name=spring-unwe
server.port=3020

# Database (PostgreSQL - même que NestJS)
spring.datasource.url=jdbc:postgresql://localhost:5432/zodback
spring.datasource.username=${DB_USER:zodback}
spring.datasource.password=${DB_PASSWORD:zodback}
spring.jpa.hibernate.ddl-auto=validate

# Mail (SendGrid)
spring.mail.host=smtp.sendgrid.net
spring.mail.port=587
spring.mail.username=apikey
spring.mail.password=${SENDGRID_API_KEY}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# Thymeleaf
spring.thymeleaf.prefix=classpath:/templates/
spring.thymeleaf.suffix=.html
spring.thymeleaf.cache=false

# Quartz Scheduler
spring.quartz.job-store-type=jdbc
spring.quartz.jdbc.initialize-schema=always

# Custom Config
zodback.python.url=http://localhost:8012
zodback.python.token=${INTERNAL_PYTHON_TOKEN:dev-internal-token}
zodback.nestjs.url=http://localhost:3013

# Firebase
firebase.credentials.path=${FIREBASE_CREDENTIALS_PATH:}

# Twilio SMS
twilio.account.sid=${TWILIO_ACCOUNT_SID:}
twilio.auth.token=${TWILIO_AUTH_TOKEN:}
twilio.phone.number=${TWILIO_PHONE_NUMBER:}
```

---

## 📁 Structure du Projet

```
spring-services/
├── pom.xml
├── README.md
│
├── src/
│   ├── main/
│   │   ├── java/com/zodback/spring/
│   │   │   │
│   │   │   ├── SpringServicesApplication.java       # Entry point
│   │   │   │
│   │   │   ├── config/                              # Configuration
│   │   │   │   ├── MailConfig.java                  # Email sender config
│   │   │   │   ├── QuartzConfig.java                # Scheduler config
│   │   │   │   ├── WebClientConfig.java             # HTTP client config
│   │   │   │   ├── FirebaseConfig.java              # Push notifications
│   │   │   │   └── RetryConfig.java                 # Retry policy
│   │   │   │
│   │   │   ├── controller/                          # REST Endpoints
│   │   │   │   ├── HealthController.java            # Health check
│   │   │   │   ├── EventsController.java            # Event consumption
│   │   │   │   ├── NotificationController.java      # Direct notifications
│   │   │   │   └── WorkflowController.java          # Workflow management
│   │   │   │
│   │   │   ├── dto/                                 # Data Transfer Objects
│   │   │   │   ├── event/
│   │   │   │   │   ├── DomainEvent.java
│   │   │   │   │   ├── PaymentEvent.java
│   │   │   │   │   ├── CourseEvent.java
│   │   │   │   │   └── UserEvent.java
│   │   │   │   ├── notification/
│   │   │   │   │   ├── EmailRequest.java
│   │   │   │   │   ├── SmsRequest.java
│   │   │   │   │   └── PushRequest.java
│   │   │   │   └── workflow/
│   │   │   │       ├── WorkflowStatus.java
│   │   │   │       └── WorkflowStep.java
│   │   │   │
│   │   │   ├── service/                             # Business Logic
│   │   │   │   ├── notification/
│   │   │   │   │   ├── NotificationService.java     # Facade
│   │   │   │   │   ├── EmailService.java            # Email sending
│   │   │   │   │   ├── SmsService.java              # SMS via Twilio
│   │   │   │   │   ├── PushService.java             # Firebase FCM
│   │   │   │   │   └── SlackService.java            # Slack webhooks
│   │   │   │   │
│   │   │   │   ├── template/
│   │   │   │   │   ├── TemplateService.java         # Template rendering
│   │   │   │   │   └── TemplateResolver.java        # Dynamic resolution
│   │   │   │   │
│   │   │   │   ├── workflow/
│   │   │   │   │   ├── WorkflowEngine.java          # State machine
│   │   │   │   │   ├── WorkflowRepository.java      # Persistence
│   │   │   │   │   └── workflows/
│   │   │   │   │       ├── OnboardingWorkflow.java
│   │   │   │   │       ├── AbandonedCartWorkflow.java
│   │   │   │   │       └── RenewalReminderWorkflow.java
│   │   │   │   │
│   │   │   │   └── integration/
│   │   │   │       ├── PythonClient.java            # Python HTTP calls
│   │   │   │       └── NestJsClient.java            # NestJS callbacks
│   │   │   │
│   │   │   ├── handler/                             # Event Handlers
│   │   │   │   ├── EventRouter.java                 # Route events
│   │   │   │   ├── PaymentEventHandler.java
│   │   │   │   ├── CourseEventHandler.java
│   │   │   │   ├── UserEventHandler.java
│   │   │   │   └── OrderEventHandler.java
│   │   │   │
│   │   │   ├── scheduler/                           # Scheduled Jobs
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── DailyAnalyticsTrigger.java
│   │   │   │   │   ├── WorkflowProcessor.java
│   │   │   │   │   └── DigestEmailJob.java
│   │   │   │   └── SchedulerService.java
│   │   │   │
│   │   │   ├── entity/                              # JPA Entities
│   │   │   │   ├── NotificationLog.java
│   │   │   │   ├── WorkflowInstance.java
│   │   │   │   └── ScheduledJob.java
│   │   │   │
│   │   │   └── repository/                          # Data Access
│   │   │       ├── NotificationLogRepository.java
│   │   │       ├── WorkflowInstanceRepository.java
│   │   │       └── ScheduledJobRepository.java
│   │   │
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── application-dev.properties
│   │       ├── application-prod.properties
│   │       │
│   │       └── templates/                           # Thymeleaf Templates
│   │           ├── email/
│   │           │   ├── layout/
│   │           │   │   └── base.html                # Base layout
│   │           │   ├── welcome.html
│   │           │   ├── payment-receipt.html
│   │           │   ├── course-completed.html
│   │           │   ├── abandoned-cart.html
│   │           │   ├── subscription-renewal.html
│   │           │   └── onboarding/
│   │           │       ├── day-0-welcome.html
│   │           │       ├── day-3-tips.html
│   │           │       └── day-7-review.html
│   │           │
│   │           └── certificate/
│   │               └── course-certificate.html
│   │
│   └── test/java/com/zodback/spring/
│       ├── SpringServicesApplicationTests.java
│       ├── service/
│       │   ├── EmailServiceTest.java
│       │   ├── WorkflowEngineTest.java
│       │   └── PythonClientTest.java
│       └── handler/
│           └── PaymentEventHandlerTest.java
│
└── docker/
    └── Dockerfile
```

---

## 📌 Plan d'Implémentation Détaillé

### Phase 1: Configuration & Infrastructure (Jour 1)

#### T1.0 - Mise à jour pom.xml
- **Dépendance:** Aucune
- **Description:** Ajouter toutes les dépendances Maven listées ci-dessus
- **Fichiers:** `pom.xml`
- **Test:** `mvn clean compile` réussit
- **Critères de succès:** Build sans erreur

#### T1.1 - Configuration application.properties
- **Dépendance:** T1.0 ✅
- **Description:** Configurer database, mail, Quartz, intégrations externes
- **Fichiers:** `application.properties`, `application-dev.properties`
- **Test:** Application démarre sans erreur
- **Critères de succès:** `mvn spring-boot:run` OK, logs propres

#### T1.2 - Classes de configuration
- **Dépendance:** T1.1 ✅
- **Description:** Créer MailConfig, QuartzConfig, WebClientConfig
- **Fichiers:** 
  - `config/MailConfig.java`
  - `config/QuartzConfig.java`
  - `config/WebClientConfig.java`
  - `config/RetryConfig.java`
- **Test:** Beans créés et injectables
- **Critères de succès:** Tests unitaires passent

---

### Phase 2: Notification Services (Jour 1-2)

#### T2.0 - Email Service Base
- **Dépendance:** T1.2 ✅
- **Description:** Implémenter EmailService avec Thymeleaf
- **Fichiers:**
  - `service/notification/EmailService.java`
  - `service/template/TemplateService.java`
- **Test:** Envoi email test vers Mailtrap/console
- **Critères de succès:** Email reçu avec template rendu

```java
// EmailService.java - Exemple
@Service
@Slf4j
public class EmailService {
    
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    
    @Value("${spring.mail.from:noreply@zodback.com}")
    private String fromAddress;
    
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000))
    public void send(String to, String subject, String templateName, Map<String, Object> variables) {
        Context context = new Context();
        context.setVariables(variables);
        
        String htmlContent = templateEngine.process("email/" + templateName, context);
        
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        
        helper.setFrom(fromAddress);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlContent, true);
        
        mailSender.send(message);
        log.info("Email sent to {} with template {}", to, templateName);
    }
}
```

#### T2.1 - Templates Email de Base
- **Dépendance:** T2.0 ✅
- **Description:** Créer templates Thymeleaf pour emails principaux
- **Fichiers:**
  - `templates/email/layout/base.html`
  - `templates/email/welcome.html`
  - `templates/email/payment-receipt.html`
  - `templates/email/course-completed.html`
- **Test:** Rendu HTML correct
- **Critères de succès:** Templates générés sans erreur Thymeleaf

#### T2.2 - SMS Service (Twilio)
- **Dépendance:** T1.2 ✅
- **Description:** Implémenter SmsService avec Twilio SDK
- **Fichiers:** `service/notification/SmsService.java`
- **Test:** Envoi SMS vers numéro test
- **Critères de succès:** SMS reçu (ou mock si pas de compte Twilio)

#### T2.3 - Push Service (Firebase)
- **Dépendance:** T1.2 ✅
- **Description:** Implémenter PushService avec Firebase Admin
- **Fichiers:**
  - `config/FirebaseConfig.java`
  - `service/notification/PushService.java`
- **Test:** Notification push vers topic test
- **Critères de succès:** Push reçu sur device/emulator

#### T2.4 - Notification Facade
- **Dépendance:** T2.0-T2.3 ✅
- **Description:** Créer facade pour orchestrer les canaux
- **Fichiers:** `service/notification/NotificationService.java`
- **Test:** Envoi multi-canal avec fallback
- **Critères de succès:** Test unitaire passe

```java
// NotificationService.java - Facade
@Service
public class NotificationService {
    
    private final EmailService emailService;
    private final SmsService smsService;
    private final PushService pushService;
    
    public void notify(NotificationRequest request) {
        // Email toujours envoyé
        if (request.getEmail() != null) {
            emailService.send(
                request.getEmail(),
                request.getSubject(),
                request.getTemplate(),
                request.getVariables()
            );
        }
        
        // SMS si numéro fourni et urgence
        if (request.getPhone() != null && request.isUrgent()) {
            smsService.send(request.getPhone(), request.getSmsContent());
        }
        
        // Push si token device fourni
        if (request.getDeviceToken() != null) {
            pushService.send(request.getDeviceToken(), request.getPushPayload());
        }
    }
}
```

---

### Phase 3: Event Handlers (Jour 2-3)

#### T3.0 - DTOs d'Événements
- **Dépendance:** Aucune
- **Description:** Créer les classes DTO pour les événements
- **Fichiers:**
  - `dto/event/DomainEvent.java`
  - `dto/event/PaymentEvent.java`
  - `dto/event/CourseEvent.java`
  - `dto/event/UserEvent.java`
- **Test:** Désérialisation JSON réussie
- **Critères de succès:** Jackson parse correctement

#### T3.1 - Event Router
- **Dépendance:** T3.0 ✅
- **Description:** Router qui dispatch les événements aux handlers
- **Fichiers:** `handler/EventRouter.java`
- **Test:** Routing vers bon handler par type
- **Critères de succès:** Test unitaire avec mock handlers

#### T3.2 - Payment Event Handler
- **Dépendance:** T2.4 ✅, T3.1 ✅
- **Description:** Handler pour `payment.*` events
- **Fichiers:** `handler/PaymentEventHandler.java`
- **Événements gérés:**
  - `payment.transaction.succeeded` → Email reçu + Invoice
  - `payment.transaction.failed` → Email d'erreur
  - `payment.subscription.activated` → Email de bienvenue
  - `payment.subscription.cancelled` → Email de confirmation
- **Test:** Mock notification sent
- **Critères de succès:** Handler appelé, notification envoyée

```java
// PaymentEventHandler.java
@Component
@Slf4j
public class PaymentEventHandler {
    
    private final NotificationService notificationService;
    private final PythonClient pythonClient;
    
    @EventListener
    public void handleTransactionSucceeded(PaymentTransactionSucceededEvent event) {
        log.info("Processing payment.transaction.succeeded for project {}", event.getProjectId());
        
        // 1. Envoyer email reçu
        notificationService.notify(NotificationRequest.builder()
            .email(event.getUserEmail())
            .subject("Votre reçu de paiement - ZodBack")
            .template("payment-receipt")
            .variables(Map.of(
                "userName", event.getUserName(),
                "amount", event.getAmount(),
                "currency", event.getCurrency(),
                "planName", event.getPlanName(),
                "transactionId", event.getTransactionId(),
                "date", event.getOccurredAt()
            ))
            .build());
        
        // 2. Trigger analytics Python
        pythonClient.triggerAnalytics(event.getProjectId(), "payment", "payment.transaction.succeeded");
    }
}
```

#### T3.3 - Course Event Handler
- **Dépendance:** T2.4 ✅, T3.1 ✅
- **Description:** Handler pour `course.*` events
- **Fichiers:** `handler/CourseEventHandler.java`
- **Événements gérés:**
  - `course.enrolled` → Email de bienvenue au cours
  - `course.completed` → Email félicitations + certificat
  - `course.lesson.completed` → Push notification progress
- **Test:** Mock notification sent
- **Critères de succès:** Handler appelé

#### T3.4 - User Event Handler
- **Dépendance:** T2.4 ✅, T3.1 ✅
- **Description:** Handler pour `user.*` events
- **Fichiers:** `handler/UserEventHandler.java`
- **Événements gérés:**
  - `user.registered` → Démarrer workflow onboarding
  - `user.profile.updated` → Log
  - `user.password.reset` → Email de reset
- **Test:** Workflow triggered
- **Critères de succès:** Handler + workflow démarré

#### T3.5 - Order Event Handler
- **Dépendance:** T2.4 ✅, T3.1 ✅
- **Description:** Handler pour `order.*` (e-commerce)
- **Fichiers:** `handler/OrderEventHandler.java`
- **Événements gérés:**
  - `order.created` → Email confirmation
  - `order.shipped` → Email + SMS tracking
  - `order.delivered` → Email + demande review
  - `cart.abandoned` → Démarrer workflow panier abandonné
- **Test:** Notifications sent
- **Critères de succès:** Handler appelé

---

### Phase 4: Python Integration (Jour 3)

#### T4.0 - Python HTTP Client
- **Dépendance:** T1.2 ✅
- **Description:** Client HTTP pour appeler Python services
- **Fichiers:** `service/integration/PythonClient.java`
- **Méthodes:**
  - `triggerAnalytics(projectId, scope, trigger)`
  - `checkJobStatus(jobId)`
  - `getAnalyticsData(projectId, metric)`
- **Test:** Appel HTTP vers Python mock
- **Critères de succès:** Réponse 200 OK

```java
// PythonClient.java
@Service
@Slf4j
public class PythonClient {
    
    private final WebClient webClient;
    
    @Value("${zodback.python.url}")
    private String pythonUrl;
    
    @Value("${zodback.python.token}")
    private String pythonToken;
    
    public Mono<JobStatus> triggerAnalytics(int projectId, String scope, String trigger) {
        return webClient.post()
            .uri(pythonUrl + "/internal/analytics/recompute")
            .header("Authorization", "Bearer " + pythonToken)
            .header("X-Project-Id", String.valueOf(projectId))
            .header("X-Request-Id", UUID.randomUUID().toString())
            .bodyValue(Map.of(
                "project_id", projectId,
                "scope", scope,
                "trigger", trigger
            ))
            .retrieve()
            .bodyToMono(JobStatus.class)
            .doOnSuccess(job -> log.info("Analytics job started: {}", job.getJobId()))
            .doOnError(e -> log.error("Failed to trigger analytics: {}", e.getMessage()));
    }
}
```

#### T4.1 - NestJS Callback Client
- **Dépendance:** T1.2 ✅
- **Description:** Client pour callbacks vers NestJS
- **Fichiers:** `service/integration/NestJsClient.java`
- **Méthodes:**
  - `notifyWorkflowCompleted(workflowId, status)`
  - `getUserDetails(userId)`
- **Test:** Appel HTTP vers NestJS mock
- **Critères de succès:** Réponse OK

---

### Phase 5: Workflow Engine (Jour 4-5)

#### T5.0 - Workflow Entities
- **Dépendance:** T1.1 ✅
- **Description:** JPA entities pour persistence workflows
- **Fichiers:**
  - `entity/WorkflowInstance.java`
  - `entity/WorkflowStep.java`
  - `repository/WorkflowInstanceRepository.java`
- **Test:** CRUD basique
- **Critères de succès:** Save/load OK

```java
// WorkflowInstance.java
@Entity
@Table(name = "workflow_instances")
public class WorkflowInstance {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "workflow_type")
    private String workflowType;  // "onboarding", "abandoned_cart", etc.
    
    @Column(name = "project_id")
    private Integer projectId;
    
    @Column(name = "entity_id")
    private String entityId;  // userId, cartId, etc.
    
    @Column(name = "current_step")
    private Integer currentStep;
    
    @Column(name = "total_steps")
    private Integer totalSteps;
    
    @Column(name = "status")
    @Enumerated(EnumType.STRING)
    private WorkflowStatus status;  // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
    
    @Column(name = "next_execution")
    private LocalDateTime nextExecution;
    
    @Column(name = "context", columnDefinition = "jsonb")
    private String context;  // JSON avec données du workflow
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

#### T5.1 - Workflow Engine Core
- **Dépendance:** T5.0 ✅
- **Description:** Moteur d'exécution de workflows
- **Fichiers:** `service/workflow/WorkflowEngine.java`
- **Fonctionnalités:**
  - Start workflow
  - Execute current step
  - Advance to next step
  - Complete/Cancel workflow
- **Test:** Workflow simple à 3 étapes
- **Critères de succès:** États transitions correctes

#### T5.2 - Onboarding Workflow
- **Dépendance:** T5.1 ✅, T2.4 ✅
- **Description:** Workflow d'onboarding en 3 étapes
- **Fichiers:** `service/workflow/workflows/OnboardingWorkflow.java`
- **Étapes:**
  1. Day 0: Send welcome email
  2. Day 3: Send tips email
  3. Day 7: Send review request
- **Test:** Simuler passage des jours
- **Critères de succès:** 3 emails planifiés/envoyés

#### T5.3 - Abandoned Cart Workflow
- **Dépendance:** T5.1 ✅, T2.4 ✅
- **Description:** Workflow panier abandonné
- **Fichiers:** `service/workflow/workflows/AbandonedCartWorkflow.java`
- **Étapes:**
  1. Wait 1h: Send reminder 1
  2. Wait 24h: Send reminder 2 with discount
  3. Wait 72h: Final reminder
- **Test:** Workflow exécuté
- **Critères de succès:** Emails envoyés à bons intervals

#### T5.4 - Subscription Renewal Workflow
- **Dépendance:** T5.1 ✅, T2.4 ✅
- **Description:** Rappels renouvellement abonnement
- **Fichiers:** `service/workflow/workflows/RenewalReminderWorkflow.java`
- **Étapes:**
  1. 7 days before: Email reminder
  2. 3 days before: Email + Push
  3. 1 day before: Email + SMS
- **Test:** Workflow triggered
- **Critères de succès:** Multi-canal

---

### Phase 6: Scheduler (Jour 5-6)

#### T6.0 - Scheduler Service
- **Dépendance:** T1.2 ✅
- **Description:** Service pour créer/gérer jobs Quartz
- **Fichiers:** `scheduler/SchedulerService.java`
- **Fonctionnalités:**
  - Schedule one-time job
  - Schedule recurring job
  - Cancel job
  - List pending jobs
- **Test:** Job scheduled et exécuté
- **Critères de succès:** Job fires at correct time

#### T6.1 - Workflow Processor Job
- **Dépendance:** T5.1 ✅, T6.0 ✅
- **Description:** Job qui process les workflows pending
- **Fichiers:** `scheduler/jobs/WorkflowProcessor.java`
- **Fréquence:** Toutes les 5 minutes
- **Action:** Chercher workflows avec nextExecution <= now, exécuter step
- **Test:** Mock workflows processed
- **Critères de succès:** Steps exécutés

#### T6.2 - Daily Analytics Trigger
- **Dépendance:** T4.0 ✅, T6.0 ✅
- **Description:** Job quotidien pour trigger analytics
- **Fichiers:** `scheduler/jobs/DailyAnalyticsTrigger.java`
- **Fréquence:** Tous les jours à 02:00
- **Action:** Appeler Python pour recalcul MRR/LTV
- **Test:** Job scheduled
- **Critères de succès:** Python appelé

#### T6.3 - Digest Email Job
- **Dépendance:** T2.0 ✅, T6.0 ✅
- **Description:** Email digest hebdomadaire
- **Fichiers:** `scheduler/jobs/DigestEmailJob.java`
- **Fréquence:** Tous les lundis à 09:00
- **Action:** Générer et envoyer digest aux admins
- **Test:** Email digest généré
- **Critères de succès:** Email envoyé

---

### Phase 7: Tests & Documentation (Jour 6-7)

#### T7.0 - Tests Unitaires
- **Dépendance:** Toutes phases ✅
- **Description:** Tests pour tous les services
- **Fichiers:** `test/java/com/zodback/spring/**`
- **Couverture cible:** > 80%
- **Critères de succès:** `mvn test` passe

#### T7.1 - Tests d'intégration
- **Dépendance:** T7.0 ✅
- **Description:** Tests end-to-end avec containers
- **Fichiers:** `test/java/com/zodback/spring/integration/**`
- **Setup:** Testcontainers pour PostgreSQL
- **Critères de succès:** Workflows complets testés

#### T7.2 - Documentation API
- **Dépendance:** Toutes phases ✅
- **Description:** Documenter tous les endpoints
- **Fichiers:** `README.md`, `docs/API.md`
- **Contenu:** Swagger/OpenAPI généré
- **Critères de succès:** Doc complète

#### T7.3 - Mise à jour README principal
- **Dépendance:** T7.2 ✅
- **Description:** Mettre à jour ReadMe.md ZodBack
- **Fichiers:** `../../ReadMe.md`
- **Contenu:** Section Spring UNWE
- **Critères de succès:** Doc cohérente

---

## 📡 Contrats d'API

### POST /api/events/v1/consume

**Description:** Consomme un événement domaine

**Headers:**
```
X-Project-Id: 42
X-Request-Id: uuid
Content-Type: application/json
```

**Body:**
```json
{
  "name": "payment.transaction.succeeded",
  "eventId": "evt_abc123",
  "source": "payments-service",
  "occurredAt": "2026-01-16T21:00:00Z",
  "payload": {
    "transactionId": 456,
    "userId": 789,
    "userEmail": "user@example.com",
    "userName": "John Doe",
    "amount": 99.99,
    "currency": "EUR",
    "planName": "Pro Monthly"
  },
  "projectId": 42
}
```

**Response:**
```json
{
  "status": "processed",
  "event": "payment.transaction.succeeded:evt_abc123",
  "notifications": ["email_sent", "analytics_triggered"]
}
```

### POST /api/notifications/v1/send

**Description:** Envoie une notification directe

**Headers:**
```
X-Project-Id: 42
Authorization: Bearer internal-token
```

**Body:**
```json
{
  "channels": ["email", "push"],
  "recipient": {
    "email": "user@example.com",
    "deviceToken": "fcm_token_xxx"
  },
  "template": "custom-notification",
  "variables": {
    "title": "Important Update",
    "message": "Your subscription has been renewed"
  },
  "urgent": false
}
```

### GET /api/workflows/v1/{workflowId}/status

**Description:** Statut d'un workflow

**Response:**
```json
{
  "id": 123,
  "type": "onboarding",
  "entityId": "user_456",
  "currentStep": 2,
  "totalSteps": 3,
  "status": "IN_PROGRESS",
  "nextExecution": "2026-01-19T09:00:00Z",
  "completedSteps": [
    {"step": 1, "name": "welcome_email", "executedAt": "2026-01-16T10:00:00Z"},
    {"step": 2, "name": "tips_email", "executedAt": "2026-01-19T10:00:00Z"}
  ]
}
```

---

## ✅ Critères de Validation Finale

### Fonctionnalités

- [ ] Événements NestJS reçus et traités
- [ ] Emails envoyés avec templates Thymeleaf
- [ ] SMS envoyés via Twilio
- [ ] Push notifications via Firebase
- [ ] Workflows persistés et exécutés
- [ ] Jobs scheduler fonctionnels
- [ ] Python analytics triggered

### Performance

- [ ] Latence traitement événement < 500ms
- [ ] Throughput > 100 events/seconde
- [ ] Retry automatique en cas d'échec

### Fiabilité

- [ ] Idempotence des handlers
- [ ] Logging structuré
- [ ] Métriques exposées (`/actuator/metrics`)

---

## 📅 Timeline Estimée

| Phase | Durée | Livrables |
|-------|-------|-----------|
| Phase 1 - Config | 2-3h | Application bootable |
| Phase 2 - Notifications | 4-5h | Email, SMS, Push services |
| Phase 3 - Event Handlers | 3-4h | Tous handlers implémentés |
| Phase 4 - Python Integration | 2h | Client HTTP fonctionnel |
| Phase 5 - Workflows | 4-5h | 3 workflows opérationnels |
| Phase 6 - Scheduler | 2-3h | Jobs planifiés |
| Phase 7 - Tests & Docs | 3-4h | Documentation complète |

**Total estimé: 20-25 heures de développement**

---

## 🚀 Prochaines Étapes

1. **Approuver ce plan**
2. **Commencer Phase 1** (Configuration)
3. **Itérer par tâche** avec tests à chaque étape
4. **Valider avec tests d'intégration**
5. **Déployer en staging**

---

*Document créé le 2026-01-16*
*Version: 1.0*
*Auteur: AI Architect Agent*
