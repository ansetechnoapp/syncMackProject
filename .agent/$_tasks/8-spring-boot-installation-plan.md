# Implementation Plan: Spring Boot Installation (T8)

## 1. Context Analysis
- **Goal**: Install Spring Boot in `spring-services` using Maven.
- **Constraints**: 100-line limit per file, test-first approach, Windows OS.
- **Acceptance Criteria**: Functional Spring Boot app, buildable with Maven, passes health check.

## 2. Global Plan
- **Phase 1**: Environment Verification (T8.1)
- **Phase 2**: Project Initialization (T8.2)
- **Phase 3**: Core Configuration & Health Check (T8.3)
- **Phase 4**: Validation & Cleanup (T8.4)

## 3. Detailed Tasks

### T8.1 Environment Verification
- **Dependency**: None
- **Description**: Verify Java 17+ and Maven are installed and accessible.
- **Test**: Run `java -version` and `mvn -version`.
- **Success Criteria**: Versions match requirements.
- **File**: `scripts/check-env.ps1`

### T8.2 Project Initialization
- **Dependency**: T8.1
- **Description**: Create `spring-services` directory and initialize Spring Boot project.
- **Method**: Manual creation of `pom.xml` and standard directory structure to ensure compliance.
- **Success Criteria**: `mvn clean compile` succeeds.
- **File**: `spring-services/pom.xml` (<= 100 lines)

### T8.3 Health Check Implementation
- **Dependency**: T8.2
- **Description**: Add a basic REST controller with a `/health` endpoint.
- **Test**: Run the app and curl the endpoint.
- **Success Criteria**: `GET /health` returns `200 OK`.
- **File**: `spring-services/src/main/java/com/zodback/spring/HealthController.java`

### T8.4 Final Validation
- **Dependency**: T8.3
- **Description**: Run full build and verify project structure.
- **Test**: `mvn package`
- **Success Criteria**: Build success, JAR generated.

## 4. Risks & Mitigations
- **Risk**: `pom.xml` exceeds 100 lines.
- **Mitigation**: Use parent POM or split dependencies into profiles/imports if needed (though unlikely for initial setup).
