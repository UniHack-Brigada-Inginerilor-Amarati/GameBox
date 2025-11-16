# Azure CLI Quick Start Guide

Simple one-off deployment guide for GameBox using Azure CLI.

## Prerequisites

1. **Azure Account** - Sign up at [azure.microsoft.com](https://azure.microsoft.com)
2. **Azure CLI** - Install from [docs.microsoft.com/cli/azure/install-azure-cli](https://docs.microsoft.com/cli/azure/install-azure-cli)
3. **Docker** - For building container images

## Quick Setup

### 1. Install Azure CLI

```bash
# macOS
brew install azure-cli

# Windows
winget install -e --id Microsoft.AzureCLI

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 2. Login to Azure

```bash
az login
```

This will open a browser for authentication.

### 3. Set Your Subscription

```bash
# List available subscriptions
az account list --output table

# Set active subscription
az account set --subscription "Your Subscription Name or ID"
```

## Easy Deployment (Automated Script)

The easiest way is to use the provided deployment script:

```bash
# Make sure you're in the project root
cd /path/to/GameBox

# Set environment variables (optional, or edit the script)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-supabase-key"
export DATABASE_URI="postgresql://user:pass@host:5432/db"
export PAYLOAD_SECRET="your-secret-key"
export S3_BUCKET="your-bucket"
export S3_ACCESS_KEY_ID="your-key"
export S3_SECRET_ACCESS_KEY="your-secret"

# Run the deployment script
./deploy-azure.sh
```

The script will:

1. ✅ Check prerequisites
2. ✅ Create resource group
3. ✅ Create container registry
4. ✅ Create app service plan
5. ✅ Create backend and Payload CMS apps
6. ✅ Build and push Docker images
7. ✅ Configure apps with environment variables
8. ✅ Restart apps

**Note:** The script generates unique names automatically to avoid conflicts.

## Manual Deployment (Step by Step)

If you prefer to run commands manually:

### Step 1: Create Resource Group

```bash
az group create \
  --name gamebox-rg \
  --location eastus
```

### Step 2: Create Container Registry

```bash
# Choose a unique name (lowercase, alphanumeric only)
ACR_NAME="gameboxregistry123"

az acr create \
  --name $ACR_NAME \
  --resource-group gamebox-rg \
  --sku Basic \
  --admin-enabled true
```

### Step 3: Create App Service Plan

```bash
az appservice plan create \
  --name gamebox-plan \
  --resource-group gamebox-rg \
  --sku B1 \
  --is-linux
```

### Step 4: Create Backend App Service

```bash
BACKEND_APP="gamebox-backend-123"  # Must be unique

# Create the app
az webapp create \
  --name $BACKEND_APP \
  --resource-group gamebox-rg \
  --plan gamebox-plan \
  --runtime "NODE:22-lts"

# Configure container
az webapp config container set \
  --name $BACKEND_APP \
  --resource-group gamebox-rg \
  --docker-custom-image-name "$ACR_NAME.azurecr.io/backend:latest" \
  --docker-registry-server-url "https://$ACR_NAME.azurecr.io"

# Set environment variables
az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group gamebox-rg \
  --settings \
    NODE_ENV=production \
    PORT=3111 \
    CORS_ORIGIN=https://your-frontend.azurestaticapps.net \
    SUPABASE_URL="https://your-project.supabase.co" \
    SUPABASE_KEY="your-supabase-key"
```

### Step 5: Create Payload CMS App Service

```bash
PAYLOAD_APP="gamebox-payload-123"  # Must be unique

# Create the app
az webapp create \
  --name $PAYLOAD_APP \
  --resource-group gamebox-rg \
  --plan gamebox-plan \
  --runtime "NODE:22-lts"

# Configure container
az webapp config container set \
  --name $PAYLOAD_APP \
  --resource-group gamebox-rg \
  --docker-custom-image-name "$ACR_NAME.azurecr.io/payload-cms:latest" \
  --docker-registry-server-url "https://$ACR_NAME.azurecr.io"

# Set environment variables
az webapp config appsettings set \
  --name $PAYLOAD_APP \
  --resource-group gamebox-rg \
  --settings \
    NODE_ENV=production \
    PORT=3000 \
    PAYLOAD_SECRET="your-secret" \
    DATABASE_URI="postgresql://..." \
    S3_BUCKET="your-bucket" \
    S3_ACCESS_KEY_ID="your-key" \
    S3_SECRET_ACCESS_KEY="your-secret"
```

### Step 6: Build and Push Docker Images

```bash
# Login to container registry
az acr login --name $ACR_NAME

# Build and push backend
az acr build \
  --registry $ACR_NAME \
  --image backend:latest \
  --file apps/backend/Dockerfile .

# Build and push Payload CMS
az acr build \
  --registry $ACR_NAME \
  --image payload-cms:latest \
  --file apps/payload-cms/Dockerfile .

# Build and push frontend
az acr build \
  --registry $ACR_NAME \
  --image frontend:latest \
  --file apps/frontend/Dockerfile .
```

### Step 7: Restart Apps

```bash
az webapp restart --name $BACKEND_APP --resource-group gamebox-rg
az webapp restart --name $PAYLOAD_APP --resource-group gamebox-rg
```

## Useful Commands

### View Application URLs

```bash
# Backend URL
az webapp show --name $BACKEND_APP --resource-group gamebox-rg --query defaultHostName -o tsv

# Payload CMS URL
az webapp show --name $PAYLOAD_APP --resource-group gamebox-rg --query defaultHostName -o tsv
```

### View Logs

```bash
# Stream logs
az webapp log tail --name $BACKEND_APP --resource-group gamebox-rg

# Download logs
az webapp log download --name $BACKEND_APP --resource-group gamebox-rg
```

### Update Environment Variables

```bash
az webapp config appsettings set \
  --name $BACKEND_APP \
  --resource-group gamebox-rg \
  --settings NEW_VAR=value
```

### List All Resources

```bash
az resource list --resource-group gamebox-rg --output table
```

### Delete Everything

```bash
# WARNING: This deletes the entire resource group and all resources
az group delete --name gamebox-rg --yes
```

## Frontend Deployment

For the frontend, you have two options:

### Option 1: Azure Static Web Apps (Recommended for Angular)

```bash
az staticwebapp create \
  --name gamebox-frontend \
  --resource-group gamebox-rg \
  --location eastus2 \
  --sku Free
```

### Option 2: App Service (Same as backend/CMS)

```bash
FRONTEND_APP="gamebox-frontend-123"

az webapp create \
  --name $FRONTEND_APP \
  --resource-group gamebox-rg \
  --plan gamebox-plan \
  --runtime "NODE:22-lts"

az webapp config container set \
  --name $FRONTEND_APP \
  --resource-group gamebox-rg \
  --docker-custom-image-name "$ACR_NAME.azurecr.io/frontend:latest" \
  --docker-registry-server-url "https://$ACR_NAME.azurecr.io"
```

## Troubleshooting

### Authentication Issues

```bash
# Re-login
az login

# Check current account
az account show
```

### Container Registry Login

```bash
# Get ACR credentials
az acr credential show --name $ACR_NAME

# Login manually
az acr login --name $ACR_NAME
```

### App Not Starting

1. Check logs: `az webapp log tail --name $APP_NAME --resource-group gamebox-rg`
2. Verify environment variables: `az webapp config appsettings list --name $APP_NAME --resource-group gamebox-rg`
3. Check container image exists: `az acr repository list --name $ACR_NAME`

### Name Conflicts

Azure requires globally unique names for:

- Container Registry
- App Service names

If you get a conflict, try adding random numbers or use the automated script which handles this.

## Cost Estimate

- **App Service Plan B1**: ~$13/month
- **Container Registry Basic**: ~$5/month
- **Total**: ~$18/month + data transfer

For production, consider:

- **S1** plan (~$55/month) for better performance
- **Standard** ACR (~$25/month) for better features

## Next Steps

1. ✅ Deploy backend and Payload CMS (done)
2. Update frontend `environment.prod.ts` with backend URL
3. Deploy frontend
4. Update CORS settings in backend
5. Set up custom domains (optional)
6. Configure monitoring and alerts (optional)

## Additional Resources

- [Azure CLI Documentation](https://docs.microsoft.com/cli/azure/)
- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure Container Registry](https://docs.microsoft.com/azure/container-registry/)
