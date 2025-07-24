```mermaid
graph TB
    subgraph "OpenShift Project Structure"
        subgraph "kuberox-development Namespace"
            DEV_DC[DeploymentConfig<br/>kuberox-backend-dev]
            DEV_SVC[Service<br/>kuberox-backend-svc]
            DEV_ROUTE[Route<br/>kuberox-dev.apps.cluster.local]
            DEV_CM[ConfigMap<br/>app-config-dev]
            DEV_SECRET[Secret<br/>oauth-credentials-dev]
        end

        subgraph "kuberox-staging Namespace"
            STAGE_DC[DeploymentConfig<br/>kuberox-backend-stage]
            STAGE_SVC[Service<br/>kuberox-backend-svc]
            STAGE_ROUTE[Route<br/>kuberox-stage.apps.cluster.local]
            STAGE_CM[ConfigMap<br/>app-config-stage]
            STAGE_SECRET[Secret<br/>oauth-credentials-stage]
            STAGE_PVC[PersistentVolumeClaim<br/>document-storage-stage]
        end

        subgraph "kuberox-production Namespace"
            PROD_DC[DeploymentConfig<br/>kuberox-backend-prod]
            PROD_SVC[Service<br/>kuberox-backend-svc]
            PROD_ROUTE[Route<br/>kuberox.kuberox.com]
            PROD_CM[ConfigMap<br/>app-config-prod]
            PROD_SECRET[Secret<br/>oauth-credentials-prod]
            PROD_PVC[PersistentVolumeClaim<br/>document-storage-prod]
            PROD_HPA[HorizontalPodAutoscaler<br/>CPU: 70%, Memory: 80%]
        end
    end

    subgraph "OpenShift Database Services"
        subgraph "PostgreSQL Operator Managed"
            DEV_DB[(PostgreSQL Instance<br/>kuberox-db-dev)]
            STAGE_DB[(PostgreSQL Cluster<br/>kuberox-db-stage<br/>Primary + Replica)]
            PROD_DB[(PostgreSQL Cluster<br/>kuberox-db-prod<br/>HA with 3 Replicas)]
        end

        subgraph "Redis Operator Managed"
            DEV_REDIS[(Redis Instance<br/>kuberox-cache-dev)]
            STAGE_REDIS[(Redis Sentinel<br/>kuberox-cache-stage<br/>Master + 2 Sentinels)]
            PROD_REDIS[(Redis Cluster<br/>kuberox-cache-prod<br/>6 Node Cluster)]
        end
    end

    subgraph "OpenShift CI/CD Pipeline"
        subgraph "Source Control Integration"
            GIT_WEBHOOK[Git Webhook<br/>Auto-trigger on push]
            BUILD_TRIGGER[Build Trigger<br/>ImageChange + Config]
        end

        subgraph "Build Process"
            BUILD_CONFIG[BuildConfig<br/>Source-to-Image (S2I)]
            S2I_BUILDER[S2I Builder Image<br/>Python 3.11 + Node 18]
            IMAGE_BUILD[Image Build Process<br/>Multi-stage Docker]
        end

        subgraph "Image Management"
            IMAGE_STREAM[ImageStream<br/>kuberox-app:latest]
            INTERNAL_REGISTRY[OpenShift Registry<br/>Internal Storage]
            IMAGE_PROMOTION[Image Promotion<br/>dev → stage → prod]
        end

        subgraph "Deployment Automation"
            DEPLOY_TRIGGER[Deployment Trigger<br/>ImageChange]
            ROLLING_DEPLOY[Rolling Deployment<br/>Zero Downtime]
            HEALTH_CHECK[Health Checks<br/>Readiness + Liveness]
        end
    end

    subgraph "OpenShift Security & RBAC"
        subgraph "Service Accounts"
            SA_BUILDER[Builder Service Account<br/>Image Build Permissions]
            SA_DEPLOYER[Deployer Service Account<br/>Deployment Permissions]
            SA_APP[Application Service Account<br/>Runtime Permissions]
        end

        subgraph "Security Context Constraints"
            SCC_RESTRICTED[Restricted SCC<br/>Default Security Policy]
            SCC_ANYUID[AnyUID SCC<br/>Legacy Application Support]
            SCC_CUSTOM[Custom SCC<br/>Application Specific]
        end

        subgraph "Network Policies"
            NP_INGRESS[Ingress Network Policy<br/>External Traffic Control]
            NP_EGRESS[Egress Network Policy<br/>Outbound Traffic Control]
            NP_INTER_NS[Inter-Namespace Policy<br/>Cross-Project Communication]
        end
    end

    subgraph "OpenShift Monitoring & Logging"
        subgraph "Built-in Monitoring"
            OCP_PROMETHEUS[OpenShift Prometheus<br/>Cluster Metrics]
            OCP_GRAFANA[OpenShift Grafana<br/>Dashboards]
            OCP_ALERTMANAGER[AlertManager<br/>Alert Routing]
        end

        subgraph "Application Monitoring"
            APP_METRICS[Application Metrics<br/>Custom Prometheus Metrics]
            SERVICE_MONITOR[ServiceMonitor<br/>Metrics Scraping Config]
            CUSTOM_ALERTS[Custom Alerts<br/>Application Specific]
        end

        subgraph "Centralized Logging"
            FLUENT_BIT[Fluent Bit<br/>Log Collection]
            ELASTICSEARCH[Elasticsearch<br/>Log Storage]
            KIBANA[Kibana<br/>Log Analysis]
        end
    end

    %% Deployment Flow
    GIT_WEBHOOK --> BUILD_TRIGGER
    BUILD_TRIGGER --> BUILD_CONFIG
    BUILD_CONFIG --> S2I_BUILDER
    S2I_BUILDER --> IMAGE_BUILD
    IMAGE_BUILD --> IMAGE_STREAM
    IMAGE_STREAM --> INTERNAL_REGISTRY

    %% Image Promotion Flow
    IMAGE_STREAM --> IMAGE_PROMOTION
    IMAGE_PROMOTION --> DEPLOY_TRIGGER
    DEPLOY_TRIGGER --> ROLLING_DEPLOY
    ROLLING_DEPLOY --> HEALTH_CHECK

    %% Environment Connections
    DEV_DC --> DEV_SVC
    DEV_SVC --> DEV_ROUTE
    DEV_DC --> DEV_CM
    DEV_DC --> DEV_SECRET
    DEV_DC --> DEV_DB
    DEV_DC --> DEV_REDIS

    STAGE_DC --> STAGE_SVC
    STAGE_SVC --> STAGE_ROUTE
    STAGE_DC --> STAGE_CM
    STAGE_DC --> STAGE_SECRET
    STAGE_DC --> STAGE_PVC
    STAGE_DC --> STAGE_DB
    STAGE_DC --> STAGE_REDIS

    PROD_DC --> PROD_SVC
    PROD_SVC --> PROD_ROUTE
    PROD_DC --> PROD_CM
    PROD_DC --> PROD_SECRET
    PROD_DC --> PROD_PVC
    PROD_DC --> PROD_DB
    PROD_DC --> PROD_REDIS
    PROD_HPA --> PROD_DC

    %% Security Connections
    SA_BUILDER --> BUILD_CONFIG
    SA_DEPLOYER --> DEV_DC
    SA_DEPLOYER --> STAGE_DC
    SA_DEPLOYER --> PROD_DC
    SA_APP --> DEV_DC
    SA_APP --> STAGE_DC
    SA_APP --> PROD_DC

    SCC_RESTRICTED --> DEV_DC
    SCC_CUSTOM --> STAGE_DC
    SCC_CUSTOM --> PROD_DC

    %% Monitoring Connections
    OCP_PROMETHEUS --> APP_METRICS
    SERVICE_MONITOR --> APP_METRICS
    APP_METRICS --> CUSTOM_ALERTS
    CUSTOM_ALERTS --> OCP_ALERTMANAGER

    %% Logging Connections
    FLUENT_BIT --> DEV_DC
    FLUENT_BIT --> STAGE_DC
    FLUENT_BIT --> PROD_DC
    FLUENT_BIT --> ELASTICSEARCH
    ELASTICSEARCH --> KIBANA

    %% Styling
    classDef development fill:#e8f5e8
    classDef staging fill:#fff3e0
    classDef production fill:#ffebee
    classDef database fill:#e3f2fd
    classDef cicd fill:#f3e5f5
    classDef security fill:#fce4ec
    classDef monitoring fill:#e8eaf6

    class DEV_DC,DEV_SVC,DEV_ROUTE,DEV_CM,DEV_SECRET,DEV_DB,DEV_REDIS development
    class STAGE_DC,STAGE_SVC,STAGE_ROUTE,STAGE_CM,STAGE_SECRET,STAGE_PVC,STAGE_DB,STAGE_REDIS staging
    class PROD_DC,PROD_SVC,PROD_ROUTE,PROD_CM,PROD_SECRET,PROD_PVC,PROD_DB,PROD_REDIS,PROD_HPA production
    class GIT_WEBHOOK,BUILD_TRIGGER,BUILD_CONFIG,S2I_BUILDER,IMAGE_BUILD,IMAGE_STREAM,INTERNAL_REGISTRY,IMAGE_PROMOTION,DEPLOY_TRIGGER,ROLLING_DEPLOY,HEALTH_CHECK cicd
    class SA_BUILDER,SA_DEPLOYER,SA_APP,SCC_RESTRICTED,SCC_ANYUID,SCC_CUSTOM,NP_INGRESS,NP_EGRESS,NP_INTER_NS security
    class OCP_PROMETHEUS,OCP_GRAFANA,OCP_ALERTMANAGER,APP_METRICS,SERVICE_MONITOR,CUSTOM_ALERTS,FLUENT_BIT,ELASTICSEARCH,KIBANA monitoring
```
