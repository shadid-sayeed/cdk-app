# syntax=docker/dockerfile:1
ARG VARIANT=24.04
ARG TARGETARCH

# =======================
# Stage 1: build-tools
# =======================
FROM mcr.microsoft.com/devcontainers/base:ubuntu-${VARIANT} AS build-tools
SHELL ["/bin/bash", "-lc"]
ENV DEBIAN_FRONTEND=noninteractive

# Map Docker's TARGETARCH -> tool labels
RUN if [ "${TARGETARCH}" = "arm64" ]; then \
      echo "ARCH=arm64"       >> /archmap && \
      echo "AWS_ARCH=aarch64" >> /archmap && \
      echo "K8S_ARCH=arm64"   >> /archmap ; \
    else \
      echo "ARCH=amd64"       >> /archmap && \
      echo "AWS_ARCH=x86_64"  >> /archmap && \
      echo "K8S_ARCH=amd64"   >> /archmap ; \
    fi

# Base packages for building tools
RUN apt-get update -y && apt-get install -y \
      curl wget git unzip openssh-client \
      ca-certificates gnupg software-properties-common lsb-release \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Terraform (via HashiCorp apt repo)
RUN wget -O- https://apt.releases.hashicorp.com/gpg \
  | gpg --dearmor | tee /usr/share/keyrings/hashicorp.gpg >/dev/null && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] \
    https://apt.releases.hashicorp.com $(. /etc/os-release && echo $VERSION_CODENAME) main" \
    | tee /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update && apt-get install -y terraform && \
    rm -rf /var/lib/apt/lists/*

# terraform-docs
ARG TERRAFORM_DOCS_VERSION=v0.19.0
RUN source /archmap && \
    OS=$(uname | tr '[:upper:]' '[:lower:]') && \
    curl -sSLo /tmp/terraform-docs.tar.gz \
      "https://github.com/terraform-docs/terraform-docs/releases/download/${TERRAFORM_DOCS_VERSION}/terraform-docs-${TERRAFORM_DOCS_VERSION}-${OS}-${ARCH}.tar.gz" && \
    tar -xzf /tmp/terraform-docs.tar.gz -C /tmp && \
    install -m0755 /tmp/terraform-docs /usr/local/bin/terraform-docs && \
    rm -f /tmp/terraform-docs*

# Terragrunt
ARG TERRAGRUNT_VERSION=v0.75.0
RUN source /archmap && \
    BINARY="terragrunt_linux_${ARCH}" && \
    wget -q "https://github.com/gruntwork-io/terragrunt/releases/download/${TERRAGRUNT_VERSION}/${BINARY}" && \
    install -m0755 "${BINARY}" /usr/local/bin/terragrunt && rm -f "${BINARY}"

# kubectl
RUN source /archmap && \
    KVER="$(curl -L -s https://dl.k8s.io/release/stable.txt)" && \
    curl -L -o /usr/local/bin/kubectl \
      "https://dl.k8s.io/release/${KVER}/bin/linux/${K8S_ARCH}/kubectl" && \
    chmod +x /usr/local/bin/kubectl

# tflint
RUN source /archmap && \
    curl -fsSL -o /tmp/tflint.zip \
      "https://github.com/terraform-linters/tflint/releases/download/v0.53.0/tflint_linux_${ARCH}.zip" && \
    unzip -q /tmp/tflint.zip -d /tmp && \
    install -m0755 /tmp/tflint /usr/local/bin/tflint && \
    rm -rf /tmp/tflint* 

# AWS CLI v2
RUN source /archmap && \
    curl -sSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o "/tmp/awscliv2.zip" && \
    unzip -q /tmp/awscliv2.zip -d /tmp && \
    /tmp/aws/install && rm -rf /tmp/aws /tmp/awscliv2.zip

# =======================
# Stage 2: runtime
# =======================
FROM mcr.microsoft.com/devcontainers/base:ubuntu-${VARIANT} AS runtime
SHELL ["/bin/bash", "-lc"]
ENV DEBIAN_FRONTEND=noninteractive

# Base utils + Python + Java + Docker CLI
RUN apt-get update -y && apt-get install -y \
      curl wget git unzip openssh-client ca-certificates gnupg \
      python3.12 python3.12-venv python3.12-dev \
      openjdk-17-jdk docker.io \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Node.js 20 (LTS) and CDK toolchain
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g aws-cdk@2 typescript ts-node yarn pnpm && \
    node -v && npm -v && cdk --version

# Copy built tools from build-tools stage
COPY --from=build-tools /usr/bin/terraform /usr/local/bin/
COPY --from=build-tools /usr/local/bin/terragrunt /usr/local/bin/
COPY --from=build-tools /usr/local/bin/terraform-docs /usr/local/bin/
COPY --from=build-tools /usr/local/bin/aws /usr/local/bin/
COPY --from=build-tools /usr/local/bin/tflint /usr/local/bin/
COPY --from=build-tools /usr/local/bin/kubectl /usr/local/bin/

# (Optional) Print versions in build logs
RUN echo -e "\n== Tool Versions ==" && \
    echo -n "Terraform: " && terraform -version | head -n1 && \
    echo -n "Terragrunt: " && terragrunt --version | head -n1 && \
    echo -n "terraform-docs: " && terraform-docs --version && \
    echo -n "tflint: " && tflint --version && \
    echo -n "kubectl: " && kubectl version --client --short && \
    echo -n "AWS CLI: " && aws --version && \
    echo -n "Node: " && node -v && \
    echo -n "npm: " && npm -v && \
    echo -n "CDK: " && cdk --version && \
    java -version || true
