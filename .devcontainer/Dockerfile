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
# AWS CLI v2 (install to fixed dirs so we can copy them later)
RUN source /archmap && set -e; \
    curl -fL --retry 3 --retry-delay 2 \
      "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" \
      -o /tmp/awscliv2.zip && \
    unzip -q /tmp/awscliv2.zip -d /tmp && \
    /tmp/aws/install -i /usr/local/aws-cli -b /usr/local/bin && \
    rm -rf /tmp/aws /tmp/awscliv2.zip

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
COPY --from=build-tools /usr/local/bin/tflint /usr/local/bin/
COPY --from=build-tools /usr/local/bin/kubectl /usr/local/bin/
COPY --from=build-tools /usr/local/aws-cli /usr/local/aws-cli

RUN ln -sf /usr/local/aws-cli/v2/current/bin/aws /usr/local/bin/aws && \
    aws --version && \
    ls -l /usr/local/bin/aws && readlink -f /usr/local/bin/aws

# --- Make 'vscode' the non-root dev user with Docker + sudo + npm global prefix ---
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=1000

RUN set -euo pipefail; \
    if ! id -u ${USERNAME} >/dev/null 2>&1; then \
      groupadd --gid ${USER_GID} ${USERNAME}; \
      useradd -s /bin/bash --uid ${USER_UID} --gid ${USER_GID} -m ${USERNAME}; \
    fi; \
    apt-get update -y && apt-get install -y sudo && apt-get clean && rm -rf /var/lib/apt/lists/*; \
    echo "${USERNAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/99-${USERNAME}; \
    chmod 0440 /etc/sudoers.d/99-${USERNAME}; \
    if [ -S /var/run/docker.sock ]; then \
      DOCKER_GID=$(stat -c '%g' /var/run/docker.sock); \
      if ! getent group docker >/dev/null; then groupadd -g "${DOCKER_GID}" docker; else groupmod -g "${DOCKER_GID}" docker || true; fi; \
      usermod -aG docker ${USERNAME} || true; \
    else \
      getent group docker >/dev/null || groupadd -g 999 docker; \
      usermod -aG docker ${USERNAME} || true; \
    fi; \
    su - ${USERNAME} -c 'mkdir -p ~/.npm-global && npm config set prefix ~/.npm-global'; \
    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' > /etc/profile.d/10-npm-global.sh

USER root

# --- Ensure workspace dir exists for bind mount ---
RUN mkdir -p /workspace && chown -R vscode:vscode /workspace

# (Optional) Set default user for runtime container
USER ${USERNAME}

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
