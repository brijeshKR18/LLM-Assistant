# OpenShift Deployment Configuration

This document provides OpenShift-specific deployment configurations and best practices for the Kuberox LLM Assistant.

## 🏗️ **OpenShift Project Structure**

### **Namespace Organization**

```yaml
# Development Environment
Project: kuberox-development
- DeploymentConfig: kuberox-backend-dev, kuberox-frontend-dev
- Services: Internal communication
- Routes: External access via *.apps.cluster.local
- ConfigMaps: Non-sensitive configuration
- Secrets: OAuth credentials, API keys

# Staging Environment
Project: kuberox-staging
- DeploymentConfig: kuberox-backend-stage (3 replicas)
- Services: Load balanced services
- Routes: SSL-enabled external routes
- PersistentVolumeClaims: Document storage
- NetworkPolicies: Security isolation

# Production Environment
Project: kuberox-production
- DeploymentConfig: kuberox-backend-prod (5+ replicas)
- Services: High availability services
- Routes: Custom domain with SSL
- HorizontalPodAutoscaler: Auto-scaling
- Operators: Database and cache management
```

## 🔧 **OpenShift-Specific Components**

### **1. BuildConfig for Source-to-Image (S2I)**

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: kuberox-backend
  namespace: kuberox-production
spec:
  source:
    type: Git
    git:
      uri: https://github.com/brijeshKR18/LLM-Assistant.git
      ref: main
    contextDir: backend
  strategy:
    type: Source
    sourceStrategy:
      from:
        kind: ImageStreamTag
        name: python:3.11
        namespace: openshift
      env:
        - name: PIP_INDEX_URL
          value: https://pypi.org/simple
  output:
    to:
      kind: ImageStreamTag
      name: kuberox-backend:latest
  triggers:
    - type: ConfigChange
    - type: GitHub
      github:
        secret: github-webhook-secret
```

### **2. DeploymentConfig with Health Checks**

```yaml
apiVersion: apps.openshift.io/v1
kind: DeploymentConfig
metadata:
  name: kuberox-backend
  namespace: kuberox-production
spec:
  replicas: 5
  selector:
    app: kuberox-backend
  template:
    metadata:
      labels:
        app: kuberox-backend
    spec:
      containers:
        - name: backend
          image: kuberox-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
            - name: GOOGLE_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: oauth-credentials
                  key: client-id
          resources:
            requests:
              memory: 512Mi
              cpu: 200m
            limits:
              memory: 1Gi
              cpu: 500m
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
  triggers:
    - type: ConfigChange
    - type: ImageChange
      imageChangeParams:
        automatic: true
        containerNames:
          - backend
        from:
          kind: ImageStreamTag
          name: kuberox-backend:latest
```

### **3. Route Configuration**

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: kuberox-backend
  namespace: kuberox-production
spec:
  host: kuberox.kuberox.com
  to:
    kind: Service
    name: kuberox-backend
    weight: 100
  port:
    targetPort: 8000-tcp
  tls:
    termination: edge
    certificate: |
      -----BEGIN CERTIFICATE-----
      # SSL Certificate
      -----END CERTIFICATE-----
    key: |
      -----BEGIN PRIVATE KEY-----
      # Private Key
      -----END PRIVATE KEY-----
    caCertificate: |
      -----BEGIN CERTIFICATE-----
      # CA Certificate
      -----END CERTIFICATE-----
  wildcardPolicy: None
```

## 🗄️ **Database Deployment with Operators**

### **PostgreSQL Operator Configuration**

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: kuberox-postgres
  namespace: kuberox-production
spec:
  instances: 3
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
  bootstrap:
    initdb:
      database: kuberox
      owner: kuberox
      secret:
        name: postgres-credentials
  storage:
    size: 100Gi
    storageClass: fast-ssd
  monitoring:
    enabled: true
  backup:
    retentionPolicy: "30d"
    barmanObjectStore:
      destinationPath: s3://kuberox-backups/postgres
      s3Credentials:
        accessKeyId:
          name: s3-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-credentials
          key: SECRET_ACCESS_KEY
```

### **Redis Operator Configuration**

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: kuberox-redis
  namespace: kuberox-production
spec:
  clusterSize: 6
  clusterVersion: v7
  persistenceEnabled: true
  redisExporter:
    enabled: true
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
        storageClassName: fast-ssd
  resources:
    requests:
      memory: 1Gi
      cpu: 500m
    limits:
      memory: 2Gi
      cpu: 1000m
```

## 🔐 **Security Configuration**

### **Custom Security Context Constraint**

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: kuberox-scc
allowHostDirVolumePlugin: false
allowHostIPC: false
allowHostNetwork: false
allowHostPID: false
allowHostPorts: false
allowPrivilegedContainer: false
allowedCapabilities: null
defaultAddCapabilities: null
fsGroup:
  type: RunAsAny
readOnlyRootFilesystem: false
requiredDropCapabilities:
  - KILL
  - MKNOD
  - SETUID
  - SETGID
runAsUser:
  type: RunAsAny
seLinuxContext:
  type: MustRunAs
volumes:
  - configMap
  - downwardAPI
  - emptyDir
  - persistentVolumeClaim
  - projected
  - secret
```

### **Network Policy**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kuberox-network-policy
  namespace: kuberox-production
spec:
  podSelector:
    matchLabels:
      app: kuberox-backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: openshift-ingress
      ports:
        - protocol: TCP
          port: 8000
    - from:
        - podSelector:
            matchLabels:
              app: kuberox-frontend
      ports:
        - protocol: TCP
          port: 8000
  egress:
    - to: []
      ports:
        - protocol: TCP
          port: 5432 # PostgreSQL
        - protocol: TCP
          port: 6379 # Redis
        - protocol: TCP
          port: 443 # HTTPS outbound
        - protocol: TCP
          port: 53 # DNS
        - protocol: UDP
          port: 53 # DNS
```

## 📊 **Monitoring Configuration**

### **ServiceMonitor for Prometheus**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kuberox-backend-monitor
  namespace: kuberox-production
  labels:
    app: kuberox-backend
spec:
  selector:
    matchLabels:
      app: kuberox-backend
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
      scheme: http
```

### **Custom Alerts**

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kuberox-alerts
  namespace: kuberox-production
spec:
  groups:
    - name: kuberox.rules
      rules:
        - alert: KuberoxHighErrorRate
          expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate in Kuberox application"
            description: "Error rate is {{ $value }} requests per second"

        - alert: KuberoxHighLatency
          expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 2
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High latency in Kuberox application"
            description: "95th percentile latency is {{ $value }} seconds"
```

## 🚀 **Deployment Best Practices**

### **1. Resource Management**

- **Requests vs Limits**: Set appropriate resource requests and limits
- **Quality of Service**: Use Guaranteed QoS for critical pods
- **Node Affinity**: Distribute pods across availability zones
- **Pod Disruption Budgets**: Ensure high availability during updates

### **2. Configuration Management**

- **ConfigMaps**: Store non-sensitive configuration
- **Secrets**: Use for sensitive data with encryption at rest
- **Environment Variables**: Inject configuration at runtime
- **Volume Mounts**: Mount config files for complex configurations

### **3. Scaling Strategy**

- **Horizontal Pod Autoscaler**: Scale based on CPU/Memory metrics
- **Vertical Pod Autoscaler**: Optimize resource allocation
- **Cluster Autoscaler**: Scale nodes based on demand
- **Custom Metrics**: Scale based on application-specific metrics

### **4. Health Checks**

- **Liveness Probes**: Restart unhealthy containers
- **Readiness Probes**: Control traffic routing
- **Startup Probes**: Handle slow-starting applications
- **Health Endpoints**: Implement comprehensive health checks

### **5. CI/CD Integration**

- **Tekton Pipelines**: Native OpenShift CI/CD
- **GitOps**: Declarative deployment management
- **Image Promotion**: Promote tested images across environments
- **Automated Testing**: Run tests in pipeline stages

## 📈 **Performance Optimization**

### **1. Container Optimization**

- **Multi-stage Builds**: Reduce image size
- **Base Image Selection**: Use optimized base images
- **Layer Caching**: Optimize Docker layer caching
- **Security Scanning**: Regular vulnerability scans

### **2. Storage Performance**

- **Storage Classes**: Use appropriate storage types
- **PV Provisioning**: Dynamic vs static provisioning
- **Backup Strategy**: Regular automated backups
- **Data Lifecycle**: Implement data retention policies

### **3. Network Optimization**

- **Service Mesh**: Implement for complex microservices
- **Load Balancing**: Optimize traffic distribution
- **Ingress Controllers**: Efficient traffic routing
- **DNS Optimization**: Minimize DNS lookup times

---

_This OpenShift deployment configuration ensures enterprise-grade reliability, security, and scalability for the Kuberox LLM Assistant platform._
