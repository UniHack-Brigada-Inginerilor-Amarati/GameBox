# GameBox

A full-stack monorepo for managing and displaying games, allowing users to browse, reserve and play mission packs, achieve awards and building a radar chart of their skills, built with **Nx**, **Angular**, **NestJS**, **Payload CMS**, and **Supabase**.

---

## 📦 Project Structure

This is a full-stack monorepo built using **Nx** with **pnpm workspaces**. The project consists of the following components:

### Applications

#### `apps/supabase`

- **Type**: Supabase CLI Service
- **Purpose**: Local PostgreSQL database backend
- **Port**: `3212`
- **Dependencies**: None (must start first)

#### `apps/payload-cms`

- **Type**: Payload CMS Application
- **Purpose**: Admin interface for managing game content
- **Port**: `3113`
- **Dependencies**: Requires Supabase to be running

#### `apps/backend`

- **Type**: NestJS Application
- **Purpose**: Backend API for the frontend
- **Port**: `3111`
- **Dependencies**: Requires Payload CMS to be running

#### `apps/frontend`

- **Type**: Angular Application
- **Purpose**: Web interface for players/admins
- **Port**: `3112`
- **Dependencies**: Requires Backend to be running

### Libraries

#### `libs/shared`

- **Type**: TypeScript Library
- **Purpose**: Share reusable types across all apps
- **Includes**: `Game` interface with `name`, `slug`, `description`, `picture`, `thumbnail`

### Communication Flow

```md
Supabase (PostgreSQL) → Payload CMS → NestJS Backend → Angular Frontend
```

1. **Supabase** provides the PostgreSQL database
2. **Payload CMS** connects to Supabase and exposes content management
3. **NestJS Backend** pulls game content from Payload CMS
4. **Angular Frontend** fetches and displays the data from the backend

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v24 or higher)
- pnpm (`npm install -g pnpm@latest-10`)
  - Configure pnpm running `pnpm setup`
- Nx CLI (`pnpm add -g nx`)
- Docker (for Supabase) running locally (preferred Docker Desktop)

### Installation

```bash
# Install dependencies
pnpm install
```

### Visualize Project Structure

Before starting any components, it's recommended to visualize the project structure:

```bash
nx graph
```

This will open an interactive graph showing all projects and their dependencies.

---

## 🏃‍♂️ Starting the Development Environment

**Important**: Components must be started in the correct order due to dependencies. Follow these steps:

### Step 1: Start Supabase (Database)

```bash
# Start Supabase
nx serve supabase
```

- **Port**: `3212`
- **Status**: Wait for "API server started" message
- **Access**: Supabase Studio will be available at `http://localhost:3213`

### Step 2: Start Payload CMS

```bash
# Start Payload CMS
nx serve payload-cms
```

- **Port**: `3113`
- **Status**: Wait for "Payload Admin Panel ready" message
- **Access**: Admin panel at `http://localhost:3113/admin`
- **Dependencies**: Requires Supabase to be running

### Step 3: Start Backend API

```bash
# Start NestJS Backend
nx serve backend
```

- **Port**: `3111`
- **Status**: Wait for "Application is running on" message
- **Access**: API available at `http://localhost:3111`
- **Dependencies**: Requires Payload CMS to be running

### Step 4: Start Frontend

```bash
# Start Angular Frontend
nx serve frontend
```

- **Port**: `3112`
- **Status**: Wait for "Application bundle generation complete" message
- **Access**: Web app at `http://localhost:3112`
- **Dependencies**: Requires Backend to be running

### Quick Start (All Components)

If you want to start all components at once (after ensuring dependencies are met):

```bash
# Visualize project structure first
nx graph

# Start all services
nx run-many --target=serve
```

**Note**: This will start all components simultaneously, but you may encounter dependency issues if services aren't ready in the correct order.

---

## 🔧 Development Commands

### Building Projects

```bash
# Build specific project
nx build backend
nx build frontend

# Build all projects
nx run-many --target=build
```

### Running Tests

```bash
# Run tests for specific project
nx test backend
nx test frontend

# Run all tests
nx run-many --target=test
```

### Linting

```bash
# Lint specific project
nx lint backend
nx lint frontend

# Lint all projects
nx run-many --target=lint
```

---

## 📱 Accessing the Applications

Once all components are running:

- **Frontend (Main App)**: <http://localhost:3112>
- **Backend API**: <http://localhost:3111>
- **Payload CMS Admin**: <http://localhost:3113/admin>
- **Supabase Studio**: <http://localhost:3213>

---

## 📝 Logging Configuration

The backend application supports configurable logging levels through the `LOG_LEVEL` environment variable.

### Available Log Levels

- `error` - Only error messages
- `warn` - Warning and error messages
- `log` - Info, warning, and error messages (default)
- `debug` - Debug, info, warning, and error messages
- `verbose` - All log messages including verbose details

### Configuration Examples

**Production (minimal logging):**

```bash
LOG_LEVEL=error,warn,log
```

**Development (includes debug logs):**

```bash
LOG_LEVEL=error,warn,log,debug
```

**Full debugging:**

```bash
LOG_LEVEL=error,warn,log,debug,verbose
```

### Setting Log Levels

1. **Environment Variable**: Set `LOG_LEVEL` in your `.env` file
2. **Default**: If not set, defaults to `log` level
3. **Multiple Levels**: Use comma-separated values (e.g., `error,warn,log,debug`)

### Log Level Hierarchy

The application uses the following logging hierarchy:

- **Controllers**: Debug-level request tracking
- **SupabaseService**: Error handling and infrastructure logging
- **Business Services**: Minimal, clean business logic
- **AppService**: Advanced request ID tracking

---

## 🛠️ Useful Nx Commands

```bash
# Show project graph
nx graph

# List all projects
nx show projects

# Show project details
nx show project <project-name>

# Generate new components/services
nx generate @nx/angular:component <name>
nx generate @nx/nest:service <name>
```

### ⛔ Shutting Down the Instances

```bash
# The payload, backend and frontend are to be closed with CTRL+C in their respective terminal window

# For Supabase, as it is a background docker service, run this command
nx stop supabase
```

---

## 📚 Additional Resources

- [Nx Documentation](https://nx.dev)
- [Angular Documentation](https://angular.io)
- [NestJS Documentation](https://nestjs.com)
- [Payload CMS Documentation](https://payloadcms.com)
- [Supabase Documentation](https://supabase.com)
