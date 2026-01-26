# Module Workflow — Analyse du code existant & Plan de tâches

> Objectif: documenter les fonctionnalités déjà implémentées et établir une liste détaillée des tâches restantes (objectifs, dépendances, spécifications, critères de validation, tests).
> Portée: module Workflow et composants transverses (Event Bus, Orchestration, Notifications, Intégrations Spring/Python, Frontend Builder).

---

## Résumé exécutif

- Événements & orchestration déjà présents côté NestJS (Event Bus, polling, règles d’orchestration, notifications, observabilité).
- Intégrations Spring/Python conformes à la hiérarchie: NestJS = autorité/gateway, Spring = consommateur/exécuteur, Python = analytics.
- Manquent: module Workflow côté NestJS (CRUD, triggers, exécutions), schéma DB Workflow, builder frontend, moteur Spring concret, workers Python dédiés au Workflow.

---

## Fonctionnalités déjà implémentées (références code)

- Event Bus (publication/abonnement, déduplication, Event Store)
  - Service: [event-bus.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/event-bus.service.ts)
  - Stockage: [eventbus.schema.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/database/eventbus.schema.ts)
  - Module: [events.module.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/events.module.ts)
- Polling interne pour Spring Boot (PULL model)
  - Controller: [events-polling.controller.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/events-polling.controller.ts)
  - Guard: [internal-token.guard.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/guards/internal-token.guard.ts)
- Orchestration déclarative
  - Engine: [orchestration.engine.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/orchestration.engine.ts)
  - Tables: [orchestration.schema.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/database/orchestration.schema.ts)
- Intégration Spring
  - Service: [spring-integration.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/spring-integration.service.ts)
- Intégration Python (analytics)
  - Service: [python-integration.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/python-integration.service.ts)
- Notifications multi‑canaux (via Spring Boot)
  - Service: [notifications.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/notifications/notifications.service.ts)
  - Client Spring: [spring-boot-client.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/notifications/services/spring-boot-client.service.ts)
  - Module: [notifications.module.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/notifications/notifications.module.ts)
- Observabilité & sécurité
  - Status Event Store: [events-polling.controller.ts: getStatus](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/events-polling.controller.ts#L97-L125)
  - Guards/API: [app.module.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/app.module.ts)

---

## Principaux gaps identifiés

- Module Workflow (NestJS) inexistant: controllers, services, DTOs, events spécifiques, versioning.
- Schéma DB Workflow absent (workflows, triggers, executions, logs, nodes, credentials, variables, analytics, templates).
- Pages Frontend pour builder/monitoring non présentes (`frontend/app/(dashboard)/workflows/` à créer).
- Moteur d’exécution Spring (NodeExecutor, Quartz, retry, WS) non implémenté dans ce repo.
- Workers Python spécifiques aux nœuds IA/ML du Workflow à structurer.

---

## Tâches restantes détaillées

### 1) Créer le module Workflow (NestJS)
- Objectifs
  - Implémenter CRUD Workflows, Triggers, Exécutions, Nodes, Credentials.
  - Émettre les Domain Events de cycle d’exécution (start/node.start/node.complete/complete).
- Dépendances
  - Event Bus: [events.module.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/events.module.ts)
  - Drizzle ORM: [drizzle-client.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/database/drizzle-client.ts)
  - Auth/Projet: guards et décorateurs JWT/ProjectContext.
- Spécifications techniques
  - Base: `/api/workflows/v1`, guards JWT + contexte projet.
  - Controllers/services/dto alignés sur la spec déjà définie dans [Module_Workflow.md](file:///c:/Users/kevin/Allproject/zodback/.agent/$_prompt/Module_Workflow.md).
- Critères de validation
  - Endpoints CRUD opérationnels, RLS respectée, events émis et stockés.
- Tests
  - Unit: services (validation, mapping, events).
  - Intégration: CRUD + Event Bus; E2E: création→trigger→exécution→logs.

### 2) Ajouter schémas DB Workflow (Drizzle + migrations)
- Objectifs
  - Implémenter tables: workflows, workflow_versions, workflow_triggers, workflow_executions, workflow_execution_logs, workflow_nodes, workflow_credentials, workflow_folders, workflow_templates, workflow_variables, workflow_analytics.
- Dépendances
  - projects/users, Event Store, orchestration/eventProcessingLogs.
- Spécifications techniques
  - Colonnes/contraintes/index/RLS selon [Module_Workflow.md](file:///c:/Users/kevin/Allproject/zodback/.agent/$_prompt/Module_Workflow.md#L357-L631).
- Critères de validation
  - Migrations générées/appliquées; requêtes lisibles; RLS activée.
- Tests
  - E2E isolation RLS; unit sur sélecteurs/insert.

### 3) Implémenter triggers & webhooks publics
- Objectifs
  - Endpoints webhook publics et cron scheduler (Spring côté moteur).
  - Activation/désactivation et journalisation des triggers.
- Dépendances
  - Webhooks module: [webhooks.module.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/webhooks/webhooks.module.ts)
  - Events Polling pour livraison à Spring.
- Spécifications techniques
  - Public: `/api/workflows/v1/webhooks/:webhookId` + GET/POST; records triggers.
- Critères de validation
  - Réception fiable, création d’exécution, event `trigger.fired` persisté.
- Tests
  - Intégration: webhook → execution record; guard public correct.

### 4) Intégration moteur Spring (UNWE)
- Objectifs
  - Consommation via `/api/events/v1/poll` et remontée de statut.
  - Implémentation NodeExecutor + retry/backoff, Quartz pour cron.
- Dépendances
  - [events-polling.controller.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/events-polling.controller.ts), [spring-integration.service.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/events/spring-integration.service.ts).
- Spécifications techniques
  - Headers internes, idempotence par `eventId`, broadcast WS.
- Critères de validation
  - Poll sécurisé (401 sans token), ordonnancement chronologique.
- Tests
  - internal-token.guard.spec existant; ajouter tests poll/status.

### 5) Gestion de la Node Library
- Objectifs
  - Registre des nœuds (types, schémas IO), exécuteurs Spring/Python/Nest.
- Dépendances
  - DB workflow_nodes; events d’exécution.
- Spécifications techniques
  - `executor_service ∈ {spring, python, nestjs}`; schémas JSON de config.
- Critères de validation
  - Chargement/validation des schémas, test de dry‑run.
- Tests
  - Unit sur validation; intégration sur exécution d’un nœud HTTP.

### 6) Credentials & secrets
- Objectifs
  - Stockage chifré AES-256, test de connexion.
- Dépendances
  - DB workflow_credentials; ConfigService pour clés.
- Spécifications techniques
  - `data_encrypted TEXT`; types: oauth2/api_key/basic_auth/custom.
- Critères de validation
  - Zéro log de secret; tests de connexion par service.
- Tests
  - Unit pour chiffrement/déchiffrement; intégration pour test endpoint.

### 7) Frontend Workflow Builder & Monitoring
- Objectifs
  - Pages dashboard (liste, builder, exécutions, logs, triggers, nodes).
- Dépendances
  - API workflows; WebSocket de status.
- Spécifications techniques
  - Next.js + React Flow; autosave; test mode dry‑run.
- Critères de validation
  - UX basique fonctionnelle; logs temps réel affichés.
- Tests
  - a11y + tests React (jsdom); intégration API mock.

### 8) Observabilité & analytics
- Objectifs
  - Métriques exécutions, temps, succès/échecs; tables analytics.
- Dépendances
  - Event Store, workflow_analytics; [observability/metrics.controller.ts](file:///c:/Users/kevin/Allproject/zodback/backend/src/observability/metrics.controller.ts).
- Spécifications techniques
  - Compteurs/moyennes/journaux par nœud et par jour.
- Critères de validation
  - Endpoints status OK; métriques cohérentes.
- Tests
  - Unit métriques; intégration calcul agrégats.

### 9) Sécurité & multi‑tenant
- Objectifs
  - RLS sur toutes les tables Workflow; headers obligatoires.
- Dépendances
  - Guards existants (JWT, ProjectContext, InternalToken).
- Spécifications techniques
  - `project_id` obligatoire; refus tokens par défaut en prod.
- Critères de validation
  - Tests RLS verts; 401/403 corrects; aucune fuite de secret.
- Tests
  - e2e RLS, guards sur endpoints internes/publics.

### 10) Documentation & exemples
- Objectifs
  - Mettre à jour [Module_Workflow.md](file:///c:/Users/kevin/Allproject/zodback/.agent/$_prompt/Module_Workflow.md) avec exemples testables.
- Dépendances
  - API/DB stabilisées.
- Spécifications techniques
  - Guides temples, modèles de workflows (blog, e‑learning, social).
- Critères de validation
  - Cohérence doc↔code, liens à jour.
- Tests
  - Non applicables (documentation), revue technique.

---

## Conformité & règles

- Références obligatoires
  - [ZodBack — Architecture & Orchestration (P0–P3).md](file:///c:/Users/kevin/Allproject/zodback/.trae/rules/ZodBack — Architecture & Orchestration (P0–P3).md)
  - [.agent/$_rules/rule.md](file:///c:/Users/kevin/Allproject/zodback/.agent/$_rules/rule.md)
- Principes clés
  - Event‑driven strict; aucun appel direct Spring→Python (via NestJS uniquement).
  - NestJS = autorité finale; Spring = exécution; Python = analytics.
  - bun pour Node, RLS partout, tests systématiques.

---

## Plan de tests global

- Unitaires: Event Bus, Orchestration, Services Workflow, Validation I/O des nœuds.
- Intégration: Polling événements, déclencheurs webhooks, notifications.
- E2E: création workflow → trigger → exécution → logs → analytics.
- Frontend: jsdom + React Testing Library pour builder et monitoring.

---

## Prochaines étapes

- Prioriser: DB Workflow (migrations) → Workflow CRUD (NestJS) → Triggers/Webhooks → Poll & moteur Spring (mise en route) → Builder frontend.
- Activer ENABLE_NOTIFICATIONS et intégrer health check Spring avant diffusion.
