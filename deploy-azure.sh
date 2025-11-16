#!/bin/bash
# Simple Azure CLI deployment script for GameBox
# This script deploys frontend, backend, and Payload CMS to Azure

set -e  # Exit on error

# ============================================================================
# CONFIGURATION - Update these values before running
# ============================================================================

RESOURCE_GROUP="gamebox-rg"
LOCATION="westus2"  # West US 2 - US regions are allowed for your subscription
# Alternative US regions: centralus, southcentralus, eastus

# Container Registry (must be globally unique, lowercase, alphanumeric only)
ACR_NAME="gameboxregistry1908"  # Adds random suffix for uniqueness

# App Service Plan
APP_SERVICE_PLAN="gamebox-plan"
APP_SERVICE_SKU="B1"  # Basic tier, 1 core (~$13/month). Options: B1, B2, B3, S1, P1V2

# Application Names (must be globally unique)
BACKEND_APP="gamebox-backend-1908"
PAYLOAD_CMS_APP="gamebox-payload-1908"
FRONTEND_APP="gamebox-frontend-1908"

# Environment Variables (update with your actual values)
SUPABASE_URL="${SUPABASE_URL:-https://culspfdpcfybzrhjytvf.supabase.co}"
SUPABASE_KEY="${SUPABASE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1bHNwZmRwY2Z5YnpyaGp5dHZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzOTQ4NzIsImV4cCI6MjA3NTk3MDg3Mn0.807KnMS6BQNHTIqbXYwZWTeK_T_ZJHphbPOCmz-7FWw}"
PAYLOAD_SECRET="${PAYLOAD_SECRET:-4305a452b389c9dd0ce00926d719fbcb}"  # Generates random secret if not set
DATABASE_URI="${DATABASE_URI:-postgresql://postgres.culspfdpcfybzrhjytvf:iubescgaybox@aws-1-eu-west-1.pooler.supabase.com:5432/postgres}"

# ============================================================================
# S3 BUCKET CONFIGURATION
# ============================================================================
# You have two buckets:
#   1. Payload CMS Media bucket - REQUIRED (for Payload CMS media storage)
#   2. Profile Avatars bucket - OPTIONAL (use either S3 or Supabase Storage)
#
# If both buckets use the same S3 account, use the same credentials for both.
# ============================================================================

# S3 Configuration for Payload CMS Media Storage (REQUIRED)
S3_BUCKET_MEDIA="${S3_BUCKET_MEDIA:-payload-media}"
S3_ACCESS_KEY_ID="${S3_ACCESS_KEY_ID:-0948fa4013b07b3b9cb1edf626f6877a}"
S3_SECRET_ACCESS_KEY="${S3_SECRET_ACCESS_KEY:-7c627af81db85412db46cddbadb38973ef88428056b87e65c2fc618b61b8e68c}"
S3_REGION="${S3_REGION:-eu-west-1}"
S3_ENDPOINT="${S3_ENDPOINT:-https://culspfdpcfybzrhjytvf.storage.supabase.co/storage/v1/s3}"

# S3 Configuration for Profile Avatars (OPTIONAL - only if using S3 for avatars)
# If you're using Supabase Storage for avatars (default), leave S3_BUCKET_AVATARS empty
# If using S3 for avatars, set S3_BUCKET_AVATARS to your avatar bucket name
S3_BUCKET_AVATARS="${S3_BUCKET_AVATARS:-}"
# Note: If both buckets are in the same S3 account, reuse S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY

# Supabase Storage for Avatars (OPTIONAL - default if S3_BUCKET_AVATARS is empty)
# This is the bucket name in Supabase Storage (usually "profile-avatars")
SUPABASE_STORAGE_BUCKET="${SUPABASE_STORAGE_BUCKET:-profile-avatars}"

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        echo "❌ Azure CLI not found. Please install it: https://docs.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi
    echo "✅ Azure CLI found"
    
    # Check if logged in
    if ! az account show &> /dev/null; then
        echo "❌ Not logged in to Azure. Running 'az login'..."
        az login
    fi
    echo "✅ Logged in to Azure"
    
    # Show current subscription
    echo "Current subscription:"
    az account show --query "{Name:name, SubscriptionId:id}" -o table
    echo ""
    
    read -p "Continue with this subscription? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Run 'az account set --subscription \"Your Subscription\"' and try again"
        exit 1
    fi
    
    # Validate region
    echo ""
    echo "Validating region: $LOCATION"
    if ! az account list-locations --query "[?name=='$LOCATION']" --output tsv | grep -q "$LOCATION"; then
        echo "⚠️  Warning: Region '$LOCATION' might not be available for your subscription"
        echo "   US alternatives: eastus, westus2, centralus, southcentralus"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Update LOCATION in the script and try again"
            exit 1
        fi
    else
        echo "✅ Region validated"
    fi
}

create_resource_group() {
    print_header "Creating Resource Group"
    
    if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        echo "Resource group '$RESOURCE_GROUP' already exists. Skipping..."
        # Verify it's in the correct location
        EXISTING_LOCATION=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
        if [ "$EXISTING_LOCATION" != "$LOCATION" ]; then
            echo "⚠️  Warning: Existing resource group is in '$EXISTING_LOCATION', but script is configured for '$LOCATION'"
        fi
    else
        echo "Testing region '$LOCATION' by creating resource group..."
        if ! az group create \
            --name "$RESOURCE_GROUP" \
            --location "$LOCATION" 2>&1; then
            echo ""
            echo "❌ ERROR: Cannot create resources in region '$LOCATION'"
            echo ""
            echo "Your subscription may have region restrictions. Try one of these:"
            echo "  - centralus (Central US)"
            echo "  - southcentralus (South Central US)"
            echo "  - westus (West US)"
            echo ""
            echo "To change region, edit the LOCATION variable in the script."
            exit 1
        fi
        echo "✅ Resource group created successfully in '$LOCATION'"
    fi
}

create_container_registry() {
    print_header "Creating Container Registry"
    
    if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        echo "Container registry '$ACR_NAME' already exists. Skipping..."
    else
        echo "Creating Azure Container Registry (this may take a minute)..."
        if ! az acr create \
            --name "$ACR_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --sku Basic \
            --admin-enabled true 2>&1; then
            echo ""
            echo "❌ ERROR: Failed to create Container Registry"
            echo ""
            echo "Possible issues:"
            echo "  1. ACR may need to be enabled for your subscription"
            echo "  2. You may have reached your quota limit"
            echo "  3. The registry name may already be taken (try running again)"
            echo ""
            echo "For Azure for Students: Make sure your $100 credit is active"
            echo "You can check your subscription status with: az account show"
            exit 1
        fi
        echo "✅ Container registry created: $ACR_NAME.azurecr.io"
    fi
}

create_app_service_plan() {
    print_header "Creating App Service Plan"
    
    if az appservice plan show --name "$APP_SERVICE_PLAN" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        echo "App Service Plan '$APP_SERVICE_PLAN' already exists. Skipping..."
    else
        # Use Windows plan for ZIP deployment (easier for Node.js apps)
        az appservice plan create \
            --name "$APP_SERVICE_PLAN" \
            --resource-group "$RESOURCE_GROUP" \
            --location "$LOCATION" \
            --sku "$APP_SERVICE_SKU" \
            --is-linux
        echo "✅ App Service Plan created"
    fi
}

create_backend_app() {
    print_header "Creating Backend App Service"
    
    if az webapp show --name "$BACKEND_APP" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        echo "Backend app '$BACKEND_APP' already exists. Updating..."
    else
        az webapp create \
            --name "$BACKEND_APP" \
            --resource-group "$RESOURCE_GROUP" \
            --plan "$APP_SERVICE_PLAN" \
            --runtime "NODE:22-lts"
        echo "✅ Backend app created"
    fi
    
    # Configure container
    ACR_LOGIN_SERVER="$ACR_NAME.azurecr.io"
    ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)
    
    az webapp config container set \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --docker-custom-image-name "$ACR_LOGIN_SERVER/backend:latest" \
        --docker-registry-server-url "https://$ACR_LOGIN_SERVER" \
        --docker-registry-server-user "$ACR_USERNAME" \
        --docker-registry-server-password "$ACR_PASSWORD"
    
    # Set environment variables for backend
    BACKEND_SETTINGS=(
        "NODE_ENV=production"
        "PORT=3111"
        "NEST_PORT=3111"
        "CORS_ORIGIN=https://$FRONTEND_APP.azurestaticapps.net"
        "SUPABASE_URL=$SUPABASE_URL"
        "SUPABASE_KEY=$SUPABASE_KEY"
        "LOG_LEVEL=error,warn,log"
    )
    
    # Add Supabase Storage bucket if set
    if [ -n "$SUPABASE_STORAGE_BUCKET" ]; then
        BACKEND_SETTINGS+=("SUPABASE_STORAGE_BUCKET=$SUPABASE_STORAGE_BUCKET")
    fi
    
    # Add S3 avatar bucket if using S3 for avatars instead of Supabase Storage
    if [ -n "$S3_BUCKET_AVATARS" ]; then
        BACKEND_SETTINGS+=(
            "S3_BUCKET_AVATARS=$S3_BUCKET_AVATARS"
            "S3_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID"
            "S3_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY"
            "S3_REGION=$S3_REGION"
            "S3_ENDPOINT=$S3_ENDPOINT"
        )
    fi
    
    az webapp config appsettings set \
        --name "$BACKEND_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --settings "${BACKEND_SETTINGS[@]}"
    
    echo "✅ Backend app configured"
    echo "   URL: https://$BACKEND_APP.azurewebsites.net"
}

create_payload_cms_app() {
    print_header "Creating Payload CMS App Service"
    
    if az webapp show --name "$PAYLOAD_CMS_APP" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        echo "Payload CMS app '$PAYLOAD_CMS_APP' already exists. Updating..."
    else
        az webapp create \
            --name "$PAYLOAD_CMS_APP" \
            --resource-group "$RESOURCE_GROUP" \
            --plan "$APP_SERVICE_PLAN" \
            --runtime "NODE:22-lts"
        echo "✅ Payload CMS app created"
    fi
    
    # Configure container
    ACR_LOGIN_SERVER="$ACR_NAME.azurecr.io"
    ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)
    
    az webapp config container set \
        --name "$PAYLOAD_CMS_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --docker-custom-image-name "$ACR_LOGIN_SERVER/payload-cms:latest" \
        --docker-registry-server-url "https://$ACR_LOGIN_SERVER" \
        --docker-registry-server-user "$ACR_USERNAME" \
        --docker-registry-server-password "$ACR_PASSWORD"
    
    # Set environment variables
    az webapp config appsettings set \
        --name "$PAYLOAD_CMS_APP" \
        --resource-group "$RESOURCE_GROUP" \
        --settings \
            NODE_ENV=production \
            PORT=3000 \
            PAYLOAD_SECRET="$PAYLOAD_SECRET" \
            DATABASE_URI="$DATABASE_URI" \
            S3_BUCKET="$S3_BUCKET_MEDIA" \
            S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
            S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
            S3_REGION="$S3_REGION" \
            S3_ENDPOINT="$S3_ENDPOINT"
    
    echo "✅ Payload CMS app configured"
    echo "   URL: https://$PAYLOAD_CMS_APP.azurewebsites.net"
}

build_and_push_images() {
    print_header "Building and Pushing Docker Images"
    
    echo "This will build and push images to Azure Container Registry..."
    echo "This may take several minutes..."
    echo ""
    
    # Login to ACR
    echo "Logging in to container registry..."
    az acr login --name "$ACR_NAME"
    
    # Build and push backend
    echo ""
    echo "Building backend image..."
    az acr build \
        --registry "$ACR_NAME" \
        --image backend:latest \
        --file apps/backend/Dockerfile .
    
    # Build and push Payload CMS
    echo ""
    echo "Building Payload CMS image..."
    az acr build \
        --registry "$ACR_NAME" \
        --image payload-cms:latest \
        --file apps/payload-cms/Dockerfile .
    
    # Build and push frontend
    echo ""
    echo "Building frontend image..."
    az acr build \
        --registry "$ACR_NAME" \
        --image frontend:latest \
        --file apps/frontend/Dockerfile .
    
    echo "✅ All images built and pushed"
}

restart_apps() {
    print_header "Restarting App Services"
    
    echo "Restarting backend..."
    az webapp restart --name "$BACKEND_APP" --resource-group "$RESOURCE_GROUP"
    
    echo "Restarting Payload CMS..."
    az webapp restart --name "$PAYLOAD_CMS_APP" --resource-group "$RESOURCE_GROUP"
    
    echo "✅ Apps restarted"
}

print_summary() {
    print_header "Deployment Summary"
    
    BACKEND_URL=$(az webapp show --name "$BACKEND_APP" --resource-group "$RESOURCE_GROUP" --query defaultHostName -o tsv)
    PAYLOAD_URL=$(az webapp show --name "$PAYLOAD_CMS_APP" --resource-group "$RESOURCE_GROUP" --query defaultHostName -o tsv)
    
    echo "✅ Deployment Complete!"
    echo ""
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Container Registry: $ACR_NAME.azurecr.io"
    echo ""
    echo "Applications:"
    echo "  Backend:     https://$BACKEND_URL"
    echo "  Payload CMS: https://$PAYLOAD_URL/admin"
    echo ""
    echo "Next Steps:"
    echo "  1. Update frontend environment.prod.ts with backend URL: https://$BACKEND_URL/api"
    echo "  2. Deploy frontend to Azure Static Web Apps or App Service"
    echo "  3. Update CORS_ORIGIN in backend app settings with your frontend URL"
    echo ""
    echo "Useful Commands:"
    echo "  View logs:    az webapp log tail --name $BACKEND_APP --resource-group $RESOURCE_GROUP"
    echo "  List apps:    az webapp list --resource-group $RESOURCE_GROUP --output table"
    echo "  Delete all:   az group delete --name $RESOURCE_GROUP --yes"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo "🚀 GameBox Azure Deployment Script"
    echo "===================================="
    echo ""
    echo "This script will:"
    echo "  1. Create resource group"
    echo "  2. Create Azure Container Registry"
    echo "  3. Create App Service Plan"
    echo "  4. Create Backend and Payload CMS App Services"
    echo "  5. Build and push Docker images"
    echo "  6. Configure and restart apps"
    echo ""
    
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
    
    check_prerequisites
    create_resource_group
    create_container_registry
    create_app_service_plan
    create_backend_app
    create_payload_cms_app
    build_and_push_images
    restart_apps
    print_summary
}

# Run main function
main

