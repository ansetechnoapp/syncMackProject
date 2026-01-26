# Task 006-B1 — Multi-Channel Notification System - Detailed Plan

**Created:** 2026-01-18
**Status:** Implementation Starting
**Priority:** P0 (Quick Win)
**Estimated Effort:** 18-24 hours
**Parent Task:** task_006_portfolio_multi_service_orchestration

---

## 🎯 Objective

Complete the notification system by implementing all channels (SMS, Slack, Discord, Telegram, Push) and create a unified orchestration layer that intelligently routes notifications based on user preferences.

---

## 🏗️ Technical Decisions

### Infrastructure Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **SMS Provider** | Twilio | Industry standard, reliable, good docs |
| **Slack** | Webhook + OAuth | Simple for basic, OAuth for advanced |
| **Discord** | Webhooks | Easy integration, no OAuth needed for webhooks |
| **Telegram** | Bot API | Free, unlimited notifications |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Already configured (FirebaseConfig.java exists) |
| **Storage** | PostgreSQL | Reuse existing DB, no extra infra |
| **Queue** | Redis (optional) | For async/retry if needed |

### Cost Analysis

| Channel | Cost | Notes |
|---------|------|-------|
| Email | ✅ Free (existing) | SendGrid/SES already configured |
| SMS | 💰 $0.0075/SMS (Twilio) | ~$7.50 per 1000 SMS |
| Slack | ✅ Free | Webhooks are free |
| Discord | ✅ Free | Webhooks are free |
| Telegram | ✅ Free | Completely free |
| Push | ✅ Free | FCM is free up to unlimited |

**Recommendation:** Start with free channels (Email, Slack, Discord, Telegram, Push), add SMS later for premium users.

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Action                              │
│  (Project published, view milestone, SEO score changed, etc.)    │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NestJS Event System                           │
│  • EventBusService emits domain event                           │
│  • Event stored in eventbus table                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              NestJS NotificationsService                         │
│  1. Checks if event should trigger notification                 │
│  2. Loads user notification preferences                          │
│  3. For each enabled channel → call Spring Boot                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│          Spring Boot NotificationOrchestrator                    │
│  • Routes to appropriate service (Email/SMS/Slack/etc.)         │
│  • Handles idempotence (check notification_logs)                │
│  • Retry logic with exponential backoff                          │
│  • Audit logging                                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┬──────────┐
        ▼               ▼               ▼               ▼          ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌─────────┐
│EmailService │ │ SmsService  │ │SlackService │ │ Discord  │ │Telegram │
│   (✅ done)  │ │  (🔧 todo)  │ │ (🔧 todo)   │ │(🆕 new)  │ │(🆕 new) │
└─────────────┘ └─────────────┘ └─────────────┘ └──────────┘ └─────────┘
        │               │               │               │          │
        ▼               ▼               ▼               ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    notification_logs table                       │
│  • Audit trail for all notifications                            │
│  • Idempotence check (prevent duplicates)                       │
│  • Delivery status tracking                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Database Schema

### New Tables

```sql
-- Notification preferences per user per project
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,  -- e.g., 'portfolio.project.published'
  channels JSONB DEFAULT '["email"]'::jsonb,  -- ["email", "slack", "discord"]
  enabled BOOLEAN DEFAULT true,
  metadata JSONB,  -- Channel-specific config (slack webhook URL, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, event_type)
);

-- Index for fast lookups
CREATE INDEX idx_notification_prefs_user_project ON notification_preferences(user_id, project_id);
CREATE INDEX idx_notification_prefs_event ON notification_preferences(event_type);

-- Channel credentials (encrypted)
CREATE TABLE notification_credentials (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  channel VARCHAR(50) NOT NULL,  -- 'slack', 'discord', 'telegram', 'twilio'
  credentials_encrypted TEXT NOT NULL,  -- Encrypted JSON
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, channel)
);

CREATE INDEX idx_notification_creds_user ON notification_credentials(user_id, project_id);
```

### Existing Table (Spring Boot)

```sql
-- notification_logs already exists in Spring Boot
CREATE TABLE notification_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  event_id VARCHAR(255),
  channel VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  template VARCHAR(255),
  status VARCHAR(50) NOT NULL,  -- 'sent', 'failed', 'pending'
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_logs_event ON notification_logs(event_id, channel);
```

---

## 🔧 Implementation Steps

### Step 1: Complete Spring Boot Notification Services (8-10 hours)

#### 1.1 Complete `SmsService.java` (2 hours)

**File:** `spring-services/src/main/java/com/zodback/spring/service/notification/SmsService.java`

```java
package com.zodback.spring.service.notification;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import com.zodback.spring.entity.NotificationLog;
import com.zodback.spring.repository.NotificationLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Slf4j
public class SmsService {
    private final NotificationLogRepository notificationLogRepository;

    @Value("${twilio.account.sid:}")
    private String accountSid;

    @Value("${twilio.auth.token:}")
    private String authToken;

    @Value("${twilio.phone.number:}")
    private String fromPhoneNumber;

    @Value("${notifications.sms.enabled:false}")
    private boolean smsEnabled;

    public SmsService(NotificationLogRepository notificationLogRepository) {
        this.notificationLogRepository = notificationLogRepository;
    }

    /**
     * Send SMS with idempotence support
     */
    @Transactional
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void send(int projectId, String eventId, String toPhoneNumber, String message) {
        // 1. Idempotence check
        if (eventId != null && notificationLogRepository.existsByEventIdAndChannel(eventId, "sms")) {
            log.debug("✅ SMS for eventId={} already sent, skipping", eventId);
            return;
        }

        if (!smsEnabled) {
            log.warn("📱 SMS notifications disabled (notifications.sms.enabled=false)");
            return;
        }

        // 2. Validate config
        if (accountSid.isEmpty() || authToken.isEmpty()) {
            log.error("❌ Twilio credentials not configured");
            saveNotificationLog(projectId, eventId, toPhoneNumber, "failed", "Missing Twilio credentials");
            return;
        }

        // 3. Initialize Twilio
        try {
            Twilio.init(accountSid, authToken);

            // 4. Send SMS
            Message twilioMessage = Message.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(fromPhoneNumber),
                    message
            ).create();

            // 5. Log success
            saveNotificationLog(projectId, eventId, toPhoneNumber, "sent", null);
            log.info("✅ SMS sent successfully to {} (sid={}, projectId={})", toPhoneNumber, twilioMessage.getSid(), projectId);

        } catch (Exception e) {
            saveNotificationLog(projectId, eventId, toPhoneNumber, "failed", e.getMessage());
            log.error("❌ Failed to send SMS to {}: {}", toPhoneNumber, e.getMessage(), e);
            throw new RuntimeException("SMS sending failed", e);
        }
    }

    private void saveNotificationLog(int projectId, String eventId, String recipient, String status, String errorMessage) {
        NotificationLog logEntry = NotificationLog.builder()
                .projectId(projectId)
                .eventId(eventId)
                .channel("sms")
                .recipient(recipient)
                .status(status)
                .errorMessage(errorMessage)
                .sentAt("sent".equals(status) ? LocalDateTime.now() : null)
                .build();
        notificationLogRepository.save(logEntry);
    }
}
```

**Configuration:** `spring-services/src/main/resources/application.properties`

```properties
# Twilio SMS Configuration
twilio.account.sid=${TWILIO_ACCOUNT_SID:}
twilio.auth.token=${TWILIO_AUTH_TOKEN:}
twilio.phone.number=${TWILIO_PHONE_NUMBER:}
notifications.sms.enabled=${NOTIFICATIONS_SMS_ENABLED:false}
```

**Dependencies:** `spring-services/pom.xml`

```xml
<!-- Twilio SDK -->
<dependency>
    <groupId>com.twilio.sdk</groupId>
    <artifactId>twilio</artifactId>
    <version>10.0.0</version>
</dependency>
```

---

#### 1.2 Complete `SlackService.java` (2-3 hours)

**File:** `spring-services/src/main/java/com/zodback/spring/service/notification/SlackService.java`

```java
package com.zodback.spring.service.notification;

import com.zodback.spring.entity.NotificationLog;
import com.zodback.spring.repository.NotificationLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class SlackService {
    private final NotificationLogRepository notificationLogRepository;
    private final RestTemplate restTemplate;

    @Value("${notifications.slack.enabled:false}")
    private boolean slackEnabled;

    public SlackService(NotificationLogRepository notificationLogRepository, RestTemplate restTemplate) {
        this.notificationLogRepository = notificationLogRepository;
        this.restTemplate = restTemplate;
    }

    /**
     * Send Slack message via webhook
     */
    @Transactional
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void send(int projectId, String eventId, String webhookUrl, String message, String channel) {
        // 1. Idempotence check
        if (eventId != null && notificationLogRepository.existsByEventIdAndChannel(eventId, "slack")) {
            log.debug("✅ Slack message for eventId={} already sent, skipping", eventId);
            return;
        }

        if (!slackEnabled) {
            log.warn("💬 Slack notifications disabled");
            return;
        }

        try {
            // 2. Build Slack message payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("text", message);
            if (channel != null) {
                payload.put("channel", channel);
            }

            // 3. Send to Slack webhook
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            String response = restTemplate.postForObject(webhookUrl, request, String.class);

            // 4. Log success
            saveNotificationLog(projectId, eventId, webhookUrl, "sent", null);
            log.info("✅ Slack message sent (projectId={}, response={})", projectId, response);

        } catch (Exception e) {
            saveNotificationLog(projectId, eventId, webhookUrl, "failed", e.getMessage());
            log.error("❌ Failed to send Slack message: {}", e.getMessage(), e);
            throw new RuntimeException("Slack sending failed", e);
        }
    }

    /**
     * Send rich Slack message with blocks
     */
    @Transactional
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void sendRich(int projectId, String eventId, String webhookUrl, Map<String, Object> blocks) {
        if (eventId != null && notificationLogRepository.existsByEventIdAndChannel(eventId, "slack")) {
            log.debug("✅ Slack message already sent");
            return;
        }

        if (!slackEnabled) return;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(blocks, headers);

            restTemplate.postForObject(webhookUrl, request, String.class);
            saveNotificationLog(projectId, eventId, webhookUrl, "sent", null);
            log.info("✅ Rich Slack message sent (projectId={})", projectId);

        } catch (Exception e) {
            saveNotificationLog(projectId, eventId, webhookUrl, "failed", e.getMessage());
            throw new RuntimeException("Slack rich message failed", e);
        }
    }

    private void saveNotificationLog(int projectId, String eventId, String recipient, String status, String errorMessage) {
        NotificationLog logEntry = NotificationLog.builder()
                .projectId(projectId)
                .eventId(eventId)
                .channel("slack")
                .recipient(recipient)
                .status(status)
                .errorMessage(errorMessage)
                .sentAt("sent".equals(status) ? LocalDateTime.now() : null)
                .build();
        notificationLogRepository.save(logEntry);
    }
}
```

---

#### 1.3 Add `DiscordService.java` (1.5 hours)

**File:** `spring-services/src/main/java/com/zodback/spring/service/notification/DiscordService.java`

```java
package com.zodback.spring.service.notification;

import com.zodback.spring.entity.NotificationLog;
import com.zodback.spring.repository.NotificationLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class DiscordService {
    private final NotificationLogRepository notificationLogRepository;
    private final RestTemplate restTemplate;

    @Value("${notifications.discord.enabled:false}")
    private boolean discordEnabled;

    public DiscordService(NotificationLogRepository notificationLogRepository, RestTemplate restTemplate) {
        this.notificationLogRepository = notificationLogRepository;
        this.restTemplate = restTemplate;
    }

    @Transactional
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void send(int projectId, String eventId, String webhookUrl, String message, String username) {
        if (eventId != null && notificationLogRepository.existsByEventIdAndChannel(eventId, "discord")) {
            log.debug("✅ Discord message already sent");
            return;
        }

        if (!discordEnabled) {
            log.warn("💬 Discord notifications disabled");
            return;
        }

        try {
            // Discord webhook payload
            Map<String, Object> payload = new HashMap<>();
            payload.put("content", message);
            if (username != null) {
                payload.put("username", username);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            restTemplate.postForObject(webhookUrl, request, String.class);

            saveNotificationLog(projectId, eventId, webhookUrl, "sent", null);
            log.info("✅ Discord message sent (projectId={})", projectId);

        } catch (Exception e) {
            saveNotificationLog(projectId, eventId, webhookUrl, "failed", e.getMessage());
            throw new RuntimeException("Discord sending failed", e);
        }
    }

    private void saveNotificationLog(int projectId, String eventId, String recipient, String status, String errorMessage) {
        NotificationLog logEntry = NotificationLog.builder()
                .projectId(projectId)
                .eventId(eventId)
                .channel("discord")
                .recipient(recipient)
                .status(status)
                .errorMessage(errorMessage)
                .sentAt("sent".equals(status) ? LocalDateTime.now() : null)
                .build();
        notificationLogRepository.save(logEntry);
    }
}
```

---

#### 1.4 Add `TelegramService.java` (2 hours)

**File:** `spring-services/src/main/java/com/zodback/spring/service/notification/TelegramService.java`

```java
package com.zodback.spring.service.notification;

import com.zodback.spring.entity.NotificationLog;
import com.zodback.spring.repository.NotificationLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class TelegramService {
    private final NotificationLogRepository notificationLogRepository;
    private final RestTemplate restTemplate;

    @Value("${telegram.bot.token:}")
    private String botToken;

    @Value("${notifications.telegram.enabled:false}")
    private boolean telegramEnabled;

    public TelegramService(NotificationLogRepository notificationLogRepository, RestTemplate restTemplate) {
        this.notificationLogRepository = notificationLogRepository;
        this.restTemplate = restTemplate;
    }

    @Transactional
    @Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
    public void send(int projectId, String eventId, String chatId, String message) {
        if (eventId != null && notificationLogRepository.existsByEventIdAndChannel(eventId, "telegram")) {
            log.debug("✅ Telegram message already sent");
            return;
        }

        if (!telegramEnabled || botToken.isEmpty()) {
            log.warn("📱 Telegram notifications disabled or bot token missing");
            return;
        }

        try {
            String url = String.format("https://api.telegram.org/bot%s/sendMessage", botToken);

            Map<String, Object> payload = new HashMap<>();
            payload.put("chat_id", chatId);
            payload.put("text", message);
            payload.put("parse_mode", "Markdown");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            restTemplate.postForObject(url, request, String.class);

            saveNotificationLog(projectId, eventId, chatId, "sent", null);
            log.info("✅ Telegram message sent to chatId={} (projectId={})", chatId, projectId);

        } catch (Exception e) {
            saveNotificationLog(projectId, eventId, chatId, "failed", e.getMessage());
            throw new RuntimeException("Telegram sending failed", e);
        }
    }

    private void saveNotificationLog(int projectId, String eventId, String recipient, String status, String errorMessage) {
        NotificationLog logEntry = NotificationLog.builder()
                .projectId(projectId)
                .eventId(eventId)
                .channel("telegram")
                .recipient(recipient)
                .status(status)
                .errorMessage(errorMessage)
                .sentAt("sent".equals(status) ? LocalDateTime.now() : null)
                .build();
        notificationLogRepository.save(logEntry);
    }
}
```

---

#### 1.5 Create `NotificationOrchestrator.java` (2-3 hours)

**File:** `spring-services/src/main/java/com/zodback/spring/service/notification/NotificationOrchestrator.java`

```java
package com.zodback.spring.service.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Orchestrates multi-channel notifications
 */
@Service
@Slf4j
public class NotificationOrchestrator {
    private final EmailService emailService;
    private final SmsService smsService;
    private final SlackService slackService;
    private final DiscordService discordService;
    private final TelegramService telegramService;
    private final PushService pushService;

    public NotificationOrchestrator(
            EmailService emailService,
            SmsService smsService,
            SlackService slackService,
            DiscordService discordService,
            TelegramService telegramService,
            PushService pushService
    ) {
        this.emailService = emailService;
        this.smsService = smsService;
        this.slackService = slackService;
        this.discordService = discordService;
        this.telegramService = telegramService;
        this.pushService = pushService;
    }

    /**
     * Send notification to a specific channel
     */
    public void send(
            int projectId,
            String eventId,
            String channel,
            Map<String, Object> config
    ) {
        log.info("📤 Sending {} notification (projectId={}, eventId={})", channel, projectId, eventId);

        try {
            switch (channel.toLowerCase()) {
                case "email":
                    sendEmail(projectId, eventId, config);
                    break;
                case "sms":
                    sendSms(projectId, eventId, config);
                    break;
                case "slack":
                    sendSlack(projectId, eventId, config);
                    break;
                case "discord":
                    sendDiscord(projectId, eventId, config);
                    break;
                case "telegram":
                    sendTelegram(projectId, eventId, config);
                    break;
                case "push":
                    sendPush(projectId, eventId, config);
                    break;
                default:
                    log.warn("⚠️  Unknown notification channel: {}", channel);
            }
        } catch (Exception e) {
            log.error("❌ Failed to send {} notification: {}", channel, e.getMessage(), e);
            // Don't throw - we don't want one channel failure to block others
        }
    }

    private void sendEmail(int projectId, String eventId, Map<String, Object> config) {
        String to = (String) config.get("to");
        String subject = (String) config.get("subject");
        String template = (String) config.get("template");
        @SuppressWarnings("unchecked")
        Map<String, Object> model = (Map<String, Object>) config.getOrDefault("model", Map.of());

        emailService.send(projectId, eventId, to, subject, template, model);
    }

    private void sendSms(int projectId, String eventId, Map<String, Object> config) {
        String to = (String) config.get("to");
        String message = (String) config.get("message");

        smsService.send(projectId, eventId, to, message);
    }

    private void sendSlack(int projectId, String eventId, Map<String, Object> config) {
        String webhookUrl = (String) config.get("webhookUrl");
        String message = (String) config.get("message");
        String channel = (String) config.get("channel");

        slackService.send(projectId, eventId, webhookUrl, message, channel);
    }

    private void sendDiscord(int projectId, String eventId, Map<String, Object> config) {
        String webhookUrl = (String) config.get("webhookUrl");
        String message = (String) config.get("message");
        String username = (String) config.get("username");

        discordService.send(projectId, eventId, webhookUrl, message, username);
    }

    private void sendTelegram(int projectId, String eventId, Map<String, Object> config) {
        String chatId = (String) config.get("chatId");
        String message = (String) config.get("message");

        telegramService.send(projectId, eventId, chatId, message);
    }

    private void sendPush(int projectId, String eventId, Map<String, Object> config) {
        String token = (String) config.get("deviceToken");
        String title = (String) config.get("title");
        String body = (String) config.get("body");
        @SuppressWarnings("unchecked")
        Map<String, String> data = (Map<String, String>) config.getOrDefault("data", Map.of());

        pushService.send(projectId, eventId, token, title, body, data);
    }
}
```

---

### Step 2: Create Spring Boot REST Controller (1-2 hours)

**File:** `spring-services/src/main/java/com/zodback/spring/NotificationApiController.java`

```java
package com.zodback.spring;

import com.zodback.spring.service.notification.NotificationOrchestrator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messaging/v1")
@Slf4j
public class NotificationApiController {
    private final NotificationOrchestrator orchestrator;

    public NotificationApiController(NotificationOrchestrator orchestrator) {
        this.orchestrator = orchestrator;
    }

    @PostMapping("/{channel}")
    public ResponseEntity<Map<String, Object>> sendNotification(
            @PathVariable String channel,
            @RequestBody Map<String, Object> request
    ) {
        int projectId = (int) request.getOrDefault("projectId", 0);
        String eventId = (String) request.get("eventId");

        log.info("📨 Received {} notification request (projectId={})", channel, projectId);

        orchestrator.send(projectId, eventId, channel, request);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "channel", channel,
                "projectId", projectId
        ));
    }
}
```

---

### Step 3: Create NestJS Orchestration Layer (4-6 hours)

#### 3.1 Database Migration

**File:** `backend/drizzle/0016_add_notification_preferences.sql`

```sql
-- Notification preferences
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channels JSONB DEFAULT '["email"]'::jsonb,
  enabled BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, event_type)
);

CREATE INDEX idx_notification_prefs_user_project ON notification_preferences(user_id, project_id);
CREATE INDEX idx_notification_prefs_event ON notification_preferences(event_type);

-- Notification credentials (encrypted)
CREATE TABLE notification_credentials (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NOT NULL,
  channel VARCHAR(50) NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, channel)
);

CREATE INDEX idx_notification_creds_user ON notification_credentials(user_id, project_id);

-- Insert default preferences for portfolio events
INSERT INTO notification_preferences (user_id, project_id, event_type, channels, enabled)
SELECT DISTINCT user_id, project_id, 'portfolio.project.published', '["email"]', true
FROM portfolio_projects
ON CONFLICT (user_id, project_id, event_type) DO NOTHING;
```

#### 3.2 Drizzle Schema

**File:** `backend/src/database/schema.ts` (add to existing)

```typescript
export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  projectId: integer('project_id').notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  channels: jsonb('channels').$type<string[]>().default(['email']),
  enabled: boolean('enabled').default(true),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const notificationCredentials = pgTable('notification_credentials', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  projectId: integer('project_id').notNull(),
  channel: varchar('channel', { length: 50 }).notNull(),
  credentialsEncrypted: text('credentials_encrypted').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

#### 3.3 NestJS Module Structure

Create notification module with the following structure:

```
backend/src/notifications/
├── notifications.module.ts
├── notifications.service.ts
├── notifications.controller.ts
├── dto/
│   ├── create-preference.dto.ts
│   ├── update-preference.dto.ts
│   ├── send-notification.dto.ts
│   └── notification-config.dto.ts
└── services/
    ├── spring-boot-client.service.ts
    └── encryption.service.ts
```

---

## 📝 Event Types & Templates

### Supported Events

```typescript
export enum PortfolioEventType {
  // Project events
  PROJECT_PUBLISHED = 'portfolio.project.published',
  PROJECT_UPDATED = 'portfolio.project.updated',

  // Analytics milestones
  VIEW_MILESTONE_1K = 'portfolio.view.milestone.1000',
  VIEW_MILESTONE_5K = 'portfolio.view.milestone.5000',
  VIEW_MILESTONE_10K = 'portfolio.view.milestone.10000',

  // SEO events
  SEO_SCORE_IMPROVED = 'portfolio.seo.score.improved',
  SEO_SCORE_DEGRADED = 'portfolio.seo.score.degraded',

  // Weekly reports
  ANALYTICS_WEEKLY_REPORT = 'portfolio.analytics.weekly_report',

  // Contact events
  CONTACT_FORM_SUBMITTED = 'portfolio.contact.submitted',
}
```

### Notification Templates

For each event, define templates for each channel:

**Email Template:** `email/portfolio-project-published.html`
**SMS Template:** "Your project '{title}' is now live! 🚀"
**Slack Template:** Rich block with project preview
**Discord Embed:** Project card with thumbnail
**Telegram:** Markdown message with link

---

## ✅ Testing Checklist

### Unit Tests (Each Service)

```bash
# Spring Boot
mvn test -Dtest=SmsServiceTest
mvn test -Dtest=SlackServiceTest
mvn test -Dtest=DiscordServiceTest
mvn test -Dtest=TelegramServiceTest
mvn test -Dtest=NotificationOrchestratorTest

# NestJS
bun test backend/src/notifications/notifications.service.spec.ts
bun test backend/src/notifications/notifications.controller.spec.ts
```

### Integration Tests

```bash
# Test NestJS → Spring Boot notification flow
bun test backend/test/integration/notifications.integration.spec.ts

# Test idempotence (sending twice should only deliver once)
bun test backend/test/integration/notification-idempotence.spec.ts

# Test all channels
bun test backend/test/integration/notification-channels.e2e.spec.ts
```

### Manual Testing

1. **Email:** Use Mailtrap or real SMTP
2. **SMS:** Use Twilio test credentials
3. **Slack:** Create test workspace webhook
4. **Discord:** Create test server webhook
5. **Telegram:** Create test bot with BotFather
6. **Push:** Use Firebase test project

---

## 🚀 Deployment Checklist

### Environment Variables

```bash
# Spring Boot (.env or application.properties)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TELEGRAM_BOT_TOKEN=your_bot_token

NOTIFICATIONS_SMS_ENABLED=true
NOTIFICATIONS_SLACK_ENABLED=true
NOTIFICATIONS_DISCORD_ENABLED=true
NOTIFICATIONS_TELEGRAM_ENABLED=true
NOTIFICATIONS_EMAIL_ENABLED=true
```

### Database Migration

```bash
cd backend
bun run drizzle-kit generate
bun run drizzle-kit migrate
```

### Spring Boot Build

```bash
cd spring-services
mvn clean package
mvn spring-boot:run
```

---

## 📊 Success Metrics

- [ ] All 6 channels working (Email, SMS, Slack, Discord, Telegram, Push)
- [ ] Idempotence verified (no duplicate notifications)
- [ ] User preferences functional (enable/disable per event)
- [ ] Audit logs complete (all sends tracked)
- [ ] Retry logic tested (handles transient failures)
- [ ] Integration tests passing (> 90% coverage)
- [ ] Performance: < 2s to send to all channels

---

## 🔗 Next Steps After B1

Once B1 is complete, move to:
1. **C1. Real-Time Analytics** (WebSocket layer)
2. **C2. Multi-Portfolio Management** (SaaS mode)
3. **A1. Portfolio Insights AI** (ML clustering)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-18
**Estimated Completion:** 18-24 hours
**Status:** Ready for Implementation
