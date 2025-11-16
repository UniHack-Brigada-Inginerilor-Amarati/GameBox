# Azure Deployment Guide

This guide covers using Azure CLI and Terraform to deploy the GameBox applications to Azure.

## Table of Contents
1. [Azure CLI Overview](#azure-cli-overview)
2. [Terraform Overview](#terraform-overview)
3. [Setup Instructions](#setup-instructions)
4. [Infrastructure as Code](#infrastructure-as-code)

---

## Azure CLI Overview

### What is Azure CLI?

Azure CLI is Microsoft's command-line interface for managing Azure resources. It provides a cross-platform tool for interacting with Azure services directly from your terminal.

### Benefits of Azure CLI

1. **Automation**: Script repetitive tasks and integrate with CI/CD pipelines
2. **Cross-platform**: Works on Windows, macOS, and Linux
3. **Comprehensive**: Access to all Azure services and features
4. **Fast**: Direct API calls without GUI overhead
5. **Version Control Friendly**: Commands can be documented and shared
6. **Batch Operations**: Manage multiple resources efficiently
7. **Integration**: Works with Azure DevOps, GitHub Actions, and other tools

### Installation

```bash
# macOS (using Homebrew)
brew install azure-cli

# Windows (using winget)
winget install -e --id Microsoft.AzureCLI

# Linux (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Authentication

```bash
# Login to Azure
az login

# Set default subscription
az account set --subscription "Your Subscription Name or ID"

# List available subscriptions
az account list --output table

# Show current account
az account show
```

### Essential Azure CLI Commands

#### Resource Group Management

```bash
# Create a resource group
az group create \
  --name gamebox-rg \
  --location eastus

# List resource groups
az group list --output table

# Delete a resource group (and all resources)
az group delete --name gamebox-rg --yes
```

#### App Service Management

```bash
# Create App Service Plan
az appservice plan create \
  --name gamebox-plan \
  --resource-group gamebox-rg \
  --sku B1 \
  --is-linux

# Create Web App (for backend or CMS)
az webapp create \
  --name gamebox-backend \
  --resource-group gamebox-rg \
  --plan gamebox-plan \
  --runtime "NODE:22-lts"

# Configure app settings (environment variables)
az webapp config appsettings set \
  --name gamebox-backend \
  --resource-group gamebox-rg \
  --settings \
    NODE_ENV=production \
    PORT=3111 \
    CORS_ORIGIN=https://your-frontend.azurewebsites.net

# Deploy from Docker image
az webapp config container set \
  --name gamebox-backend \
  --resource-group gamebox-rg \
  --docker-custom-image-name your-registry.azurecr.io/backend:latest

# View logs
az webapp log tail \
  --name gamebox-backend \
  --resource-group gamebox-rg
```

#### Container Registry (ACR)

```bash
# Create Azure Container Registry
az acr create \
  --name gameboxregistry \
  --resource-group gamebox-rg \
  --sku Basic

# Login to ACR
az acr login --name gameboxregistry

# Build and push Docker image
az acr build \
  --registry gameboxregistry \
  --image backend:latest \
  --file apps/backend/Dockerfile .

# List images
az acr repository list --name gameboxregistry --output table
```

#### Static Web Apps

```bash
# Create Static Web App
az staticwebapp create \
  --name gamebox-frontend \
  --resource-group gamebox-rg \
  --location eastus2 \
  --sku Free

# Deploy from GitHub
az staticwebapp create \
  --name gamebox-frontend \
  --resource-group gamebox-rg \
  --location eastus2 \
  --repo-url https://github.com/yourusername/GameBox \
  --branch main \
  --app-location "apps/frontend" \
  --output-location "dist/apps/frontend/browser"
```

#### Container Apps (Alternative to App Service)

```bash
# Create Container Apps environment
az containerapp env create \
  --name gamebox-env \
  --resource-group gamebox-rg \
  --location eastus

# Create Container App
az containerapp create \
  --name gamebox-backend \
  --resource-group gamebox-rg \
  --environment gamebox-env \
  --image your-registry.azurecr.io/backend:latest \
  --target-port 3111 \
  --ingress external \
  --env-vars \
    NODE_ENV=production \
    PORT=3111
```

#### Useful Utility Commands

```bash
# Get resource details
az resource show \
  --name gamebox-backend \
  --resource-group gamebox-rg \
  --resource-type Microsoft.Web/sites

# List all resources in a group
az resource list \
  --resource-group gamebox-rg \
  --output table

# Export resource group as ARM template
az group export \
  --name gamebox-rg \
  --output-file template.json

# Check resource health
az monitor metrics list \
  --resource /subscriptions/{sub-id}/resourceGroups/gamebox-rg/providers/Microsoft.Web/sites/gamebox-backend
```

---

## Terraform Overview

### What is Terraform?

Terraform is an Infrastructure as Code (IaC) tool by HashiCorp that allows you to define, provision, and manage cloud infrastructure using declarative configuration files.

### Benefits of Terraform

1. **Infrastructure as Code**: Version control your infrastructure
2. **State Management**: Track resource state and changes
3. **Multi-Cloud**: Works with Azure, AWS, GCP, and more
4. **Plan Before Apply**: Preview changes before execution
5. **Idempotency**: Safe to run multiple times
6. **Modularity**: Reusable modules for common patterns
7. **Collaboration**: Team members can review and approve changes
8. **Rollback**: Easy to revert to previous states
9. **Documentation**: Code serves as documentation
10. **Cost Estimation**: Preview costs before deployment

### Terraform vs Azure CLI

| Feature | Azure CLI | Terraform |
|---------|-----------|-----------|
| **State Management** | Manual | Automatic |
| **Change Preview** | No | Yes (plan) |
| **Version Control** | Scripts | Native |
| **Rollback** | Manual | Automatic |
| **Multi-Cloud** | Azure only | Yes |
| **Learning Curve** | Lower | Higher |
| **Best For** | Quick tasks, scripts | Production infrastructure |

### Installation

```bash
# macOS (using Homebrew)
brew install terraform

# Windows (using Chocolatey)
choco install terraform

# Linux
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

### Basic Terraform Workflow

```bash
# Initialize Terraform (downloads providers)
terraform init

# Validate configuration
terraform validate

# Preview changes (dry-run)
terraform plan

# Apply changes
terraform apply

# Destroy infrastructure
terraform destroy
```

### Terraform Configuration Structure

```
infrastructure/
├── main.tf              # Main resource definitions
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── terraform.tfvars     # Variable values (gitignored)
├── backend.tf           # State backend configuration
└── modules/            # Reusable modules
    ├── app-service/
    ├── container-registry/
    └── static-web-app/
```

---

## Setup Instructions

### Prerequisites

1. **Azure Account**: Sign up at [azure.microsoft.com](https://azure.microsoft.com)
2. **Azure CLI**: Install and login (`az login`)
3. **Terraform**: Install latest version
4. **Docker**: For building container images

### Quick Start with Azure CLI

```bash
# 1. Login to Azure
az login

# 2. Set subscription
az account set --subscription "Your Subscription"

# 3. Create resource group
az group create \
  --name gamebox-rg \
  --location eastus

# 4. Create Container Registry
az acr create \
  --name gameboxregistry \
  --resource-group gamebox-rg \
  --sku Basic

# 5. Create App Service Plan
az appservice plan create \
  --name gamebox-plan \
  --resource-group gamebox-rg \
  --sku B1 \
  --is-linux
```

### Quick Start with Terraform

```bash
# 1. Navigate to infrastructure directory
cd infrastructure

# 2. Initialize Terraform
terraform init

# 3. Review plan
terraform plan

# 4. Apply infrastructure
terraform apply
```

---

## Infrastructure as Code

### Recommended Approach

**Use Terraform for:**
- Production deployments
- Team collaboration
- Version-controlled infrastructure
- Complex multi-resource setups

**Use Azure CLI for:**
- Quick one-off tasks
- Scripts and automation
- CI/CD pipelines
- Troubleshooting and debugging

### Best Practices

1. **Start with Terraform**: Define all infrastructure in code
2. **Use Modules**: Create reusable modules for common patterns
3. **Version Control**: Commit Terraform files to Git
4. **Remote State**: Use Azure Storage for state files (team collaboration)
5. **Variables**: Use `.tfvars` files for environment-specific values
6. **Outputs**: Export important values (URLs, connection strings)
7. **Documentation**: Comment complex configurations

### Next Steps

1. Review the Terraform configuration files in `infrastructure/` directory
2. Customize variables in `terraform.tfvars.example`
3. Run `terraform init` and `terraform plan`
4. Apply infrastructure with `terraform apply`
5. Build and deploy Docker images to Azure Container Registry
6. Configure App Services with container images

---

## Additional Resources

- [Azure CLI Documentation](https://docs.microsoft.com/cli/azure/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure Container Apps](https://docs.microsoft.com/azure/container-apps/)
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)

