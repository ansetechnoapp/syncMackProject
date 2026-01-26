# Module E-Learning

> **ZodBack Module** | Event-driven | API-governed | Multi-project

## Objectif

Plateforme de formation en ligne : gestion cours, sections, leçons, quiz, progression, certifications. Intégration paiements pour monétisation.

---

## Architecture

| Layer | Location | Tech |
|-------|----------|------|
| Dashboard | `frontend/app/(dashboard)/elearning/` | Next.js, React Query |
| Student Portal | `frontend/app/elearning-portal/` | Next.js |
| Backend | `backend/src/elearning/` | NestJS, Drizzle ORM |
| Public API | `/api/elearning/v1/public` | ApiTokenGuard |

**Distribution services:**
- **NestJS:** CRUD cours, inscriptions, progression, quiz
- **Spring Boot:** Notifications, certificats PDF, cron jobs
- **Python:** Analytics, recommandations IA, transcription vidéo

---

## Pages Dashboard (12)

overview, courses, categories, lessons, quizzes, students, enrollments, certificates, reviews, analytics, settings, instructors

---

## Endpoints API

**Interne:** `/api/elearning/v1` (JwtGuard)
**Public:** `/api/elearning/v1/public` (ApiTokenGuard)

| Ressource | Endpoints |
|-----------|-----------|
| Courses | CRUD `/courses`, GET `/courses/:slug` |
| Sections | CRUD `/courses/:id/sections` |
| Lessons | CRUD `/sections/:id/lessons` |
| Quizzes | CRUD `/lessons/:id/quiz`, POST `/quiz/:id/submit` |
| Enrollments | POST `/courses/:id/enroll`, GET `/my/enrollments` |
| Progress | PATCH `/lessons/:id/progress`, GET `/courses/:id/progress` |
| Certificates | GET `/certificates`, POST `/courses/:id/certificate` |

---

## Tables (13)

**Core:** `courses`, `course_categories`, `course_category_relations`, `course_sections`, `course_lessons`

**Progress:** `course_enrollments`, `course_entitlements`, `lesson_progress`

**Quiz:** `course_quizzes`, `quiz_questions`, `quiz_attempts`

**Certification:** `course_certificates`, `course_reviews`

---

## Events Émis

| Event | Consommateurs |
|-------|---------------|
| `elearning.course.published` | Notifications, Social Media |
| `elearning.enrollment.created` | Notifications, Analytics |
| `elearning.lesson.completed` | Progress tracking, Gamification |
| `elearning.quiz.passed` | Certificats, Notifications |
| `elearning.course.completed` | Certificats, Notifications |
| `elearning.certificate.issued` | Email, Analytics |

---

## Intégrations Inter-Modules

| Source | Event | Cible | Action |
|--------|-------|-------|--------|
| Payments | `payment.completed` | E-Learning | Créer entitlement cours |
| E-Learning | `course.completed` | Notifications | Email certificat |
| E-Learning | `course.published` | Blog | Article auto |
| E-Learning | `enrollment.created` | Analytics | Track conversion |

---

## Sécurité Tokens

- **Entity:** `'elearning'`
- **Permissions public:** `['read']` (catalogue)
- **Permissions student:** `['read', 'progress']`
- **Permissions admin:** `['read', 'write', 'delete']`

---

## Critères de Succès

- [ ] CRUD cours avec sections/leçons
- [ ] Système de quiz avec scoring
- [ ] Progression par leçon/cours
- [ ] Génération certificats PDF
- [ ] Intégration paiements (entitlements)
- [ ] Analytics (completion rates, temps)
- [ ] Notifications automatiques
- [ ] Multi-instructeur avec rôles

---

## Résumé d'Action (immédiat)

- CRUD cours/sections/leçons + inscriptions + progression
- Quiz + scoring + events `elearning.quiz.passed`
- Certificats PDF (Spring) + events `elearning.certificate.issued`
- Entitlements via paiements (NestJS `payments`) sans duplication
- Multi‑tenant: `projectId` obligatoire, RLS activée

## Communication Inter‑Services

- Frontend → NestJS (JWT + `x-project-id`)
- Spring ← NestJS: poll événements pour scheduling/exports
- Python: analytics/recommandations orchestrées via NestJS (headers internes)
- Paiements restent dans NestJS; modules consomment les événements

## Roadmap MVP

- P0: CRUD + Progression + Quiz + Certificats + Events
- P1: Portail étudiant, reviews, analytics tableau de bord
- P2: Gamification avancée, intégrations (Blog/Social)
