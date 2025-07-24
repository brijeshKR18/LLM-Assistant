```mermaid
graph LR
    subgraph "Development Environment"
        DEV_FE[Frontend Dev<br/>Vite + HMR]
        DEV_BE[Backend Dev<br/>FastAPI + Reload]
        DEV_DB[(Local PostgreSQL)]
        DEV_REDIS[(Local Redis)]
    end

    subgraph "Testing Environment"
        TEST_FE[Frontend Test<br/>Jest + Cypress]
        TEST_BE[Backend Test<br/>PyTest + Coverage]
        TEST_DB[(Test Database)]
        TEST_MOCK[Mock Services]
    end

    subgraph "OpenShift Staging Cluster"
        STAGE_NS[Staging Namespace<br/>kuberox-staging]
        STAGE_FE[Frontend Pod<br/>Nginx + Static Files]
        STAGE_BE[Backend Deployment<br/>3 Replicas]
        STAGE_DB[(PostgreSQL Operator<br/>High Availability)]
        STAGE_REDIS[(Redis Operator<br/>Master-Slave)]
        STAGE_ROUTE[OpenShift Route<br/>SSL Termination]
        STAGE_SVC[Kubernetes Services<br/>Internal Communication]
    end

    subgraph "OpenShift Production Cluster"
        PROD_NS[Production Namespace<br/>kuberox-production]
        PROD_FE[Frontend Deployment<br/>Auto-scaling Pods]
        PROD_BE[Backend Deployment<br/>5+ Replicas]
        PROD_DB[(PostgreSQL Cluster<br/>Operator Managed)]
        PROD_REDIS[(Redis Cluster<br/>High Availability)]
        PROD_ROUTE[Production Route<br/>Custom Domain + SSL]
        PROD_SVC[Service Mesh<br/>Istio/OpenShift Service Mesh]
        PROD_MONITOR[Monitoring Stack<br/>Prometheus + Grafana]
        PROD_HPA[Horizontal Pod Autoscaler<br/>CPU/Memory Based]
    end

    subgraph "CI/CD Pipeline - OpenShift"
        GIT[Git Repository<br/>GitHub/GitLab]
        TEKTON[Tekton Pipelines<br/>OpenShift Pipelines]
        BUILD_CONFIG[BuildConfig<br/>Source-to-Image (S2I)]
        IMAGE_STREAM[ImageStream<br/>Container Registry]
        DEPLOY_CONFIG[DeploymentConfig<br/>Rolling Updates]
        WEBHOOK[Git Webhooks<br/>Auto Trigger]
    end

    subgraph "OpenShift Infrastructure"
        OCP_MASTER[OpenShift Master Nodes<br/>Control Plane]
        OCP_WORKER[OpenShift Worker Nodes<br/>Application Workloads]
        OCP_REGISTRY[Internal Registry<br/>Container Images]
        OCP_STORAGE[Persistent Storage<br/>StorageClass + PVCs]
        OCP_NETWORK[SDN/OVN-Kubernetes<br/>Pod Networking]
        OCP_SECURITY[Security Context Constraints<br/>Pod Security]
    end

    subgraph "OpenShift Operators"
        DB_OPERATOR[PostgreSQL Operator<br/>Database Management]
        REDIS_OPERATOR[Redis Operator<br/>Cache Management]
        CERT_OPERATOR[Cert-Manager<br/>SSL Certificate Automation]
        BACKUP_OPERATOR[Backup Operator<br/>Automated Backups]
        MONITORING_OPERATOR[Prometheus Operator<br/>Metrics Collection]
    end

    %% Development Flow
    GIT --> TEKTON
    TEKTON --> BUILD_CONFIG
    BUILD_CONFIG --> IMAGE_STREAM
    IMAGE_STREAM --> DEPLOY_CONFIG
    WEBHOOK --> TEKTON

    %% Development to Testing
    DEV_FE --> TEST_FE
    DEV_BE --> TEST_BE
    DEV_DB --> TEST_DB

    %% Testing to Staging
    TEST_FE --> STAGE_FE
    TEST_BE --> STAGE_BE
    IMAGE_STREAM --> STAGE_FE
    IMAGE_STREAM --> STAGE_BE

    %% Staging to Production
    STAGE_FE --> PROD_FE
    STAGE_BE --> PROD_BE
    DEPLOY_CONFIG --> PROD_FE
    DEPLOY_CONFIG --> PROD_BE

    %% OpenShift Infrastructure
    STAGE_NS --> OCP_WORKER
    PROD_NS --> OCP_WORKER
    OCP_MASTER --> OCP_WORKER
    OCP_REGISTRY --> IMAGE_STREAM

    %% Storage and Networking
    STAGE_DB --> OCP_STORAGE
    PROD_DB --> OCP_STORAGE
    STAGE_SVC --> OCP_NETWORK
    PROD_SVC --> OCP_NETWORK

    %% Security
    STAGE_FE --> OCP_SECURITY
    STAGE_BE --> OCP_SECURITY
    PROD_FE --> OCP_SECURITY
    PROD_BE --> OCP_SECURITY

    %% Operators Management
    DB_OPERATOR --> STAGE_DB
    DB_OPERATOR --> PROD_DB
    REDIS_OPERATOR --> STAGE_REDIS
    REDIS_OPERATOR --> PROD_REDIS
    CERT_OPERATOR --> STAGE_ROUTE
    CERT_OPERATOR --> PROD_ROUTE
    BACKUP_OPERATOR --> PROD_DB
    MONITORING_OPERATOR --> PROD_MONITOR

    %% Routes and Services
    STAGE_ROUTE --> STAGE_SVC
    STAGE_SVC --> STAGE_FE
    STAGE_SVC --> STAGE_BE

    PROD_ROUTE --> PROD_SVC
    PROD_SVC --> PROD_FE
    PROD_SVC --> PROD_BE

    %% Auto-scaling
    PROD_HPA --> PROD_FE
    PROD_HPA --> PROD_BE

    %% Monitoring
    PROD_MONITOR --> PROD_FE
    PROD_MONITOR --> PROD_BE
    PROD_MONITOR --> PROD_DB
    PROD_MONITOR --> PROD_REDIS

    %% Styling
    classDef development fill:#e8f5e8
    classDef testing fill:#e3f2fd
    classDef staging fill:#fff3e0
    classDef production fill:#ffebee
    classDef pipeline fill:#f3e5f5
    classDef infrastructure fill:#fce4ec
    classDef operators fill:#e8eaf6

    class DEV_FE,DEV_BE,DEV_DB,DEV_REDIS development
    class TEST_FE,TEST_BE,TEST_DB,TEST_MOCK testing
    class STAGE_NS,STAGE_FE,STAGE_BE,STAGE_DB,STAGE_REDIS,STAGE_ROUTE,STAGE_SVC staging
    class PROD_NS,PROD_FE,PROD_BE,PROD_DB,PROD_REDIS,PROD_ROUTE,PROD_SVC,PROD_MONITOR,PROD_HPA production
    class GIT,TEKTON,BUILD_CONFIG,IMAGE_STREAM,DEPLOY_CONFIG,WEBHOOK pipeline
    class OCP_MASTER,OCP_WORKER,OCP_REGISTRY,OCP_STORAGE,OCP_NETWORK,OCP_SECURITY infrastructure
    class DB_OPERATOR,REDIS_OPERATOR,CERT_OPERATOR,BACKUP_OPERATOR,MONITORING_OPERATOR operators
```
