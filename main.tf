terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# --- Variables ---
variable "gcp_project_id" {
  description = "Your Google Cloud Project ID"
  default     = "aisave4u"
}

variable "gcp_region" {
  description = "Region for Cloud Run (must support domain mappings)"
  # NOTE: australia-southeast1 does NOT allow domain mappings; asia-southeast1 does.
  default     = "asia-southeast1"
}

variable "azure_resource_group" {
  description = "The Azure Resource Group name where your DNS Zone is located"
  default     = "rg-dns-core-prod-001"
}

variable "domain_name" {
  description = "The root domain name in Azure DNS"
  default     = "aisave4u.app"
}

variable "subdomain" {
  description = "The subdomain for this app"
  default     = "www"
}

# Who is allowed to invoke Cloud Run.
# NOTE: 'allUsers' is blocked by org policy; so we scope it to you for now.
variable "cloud_run_invoker_member" {
  description = "IAM member that can invoke the Cloud Run service"
  default     = "allUsers"
}

# --- Providers ---
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "azurerm" {
  features {}
}

# --- 1. Enable Required Google APIs ---
resource "google_project_service" "run_api" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry_api" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild_api" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# --- 2. Artifact Registry Repository ---
resource "google_artifact_registry_repository" "app_repo" {
  location      = var.gcp_region
  repository_id = "ai-apps-repo"
  description   = "Docker repository for AI Apps"
  format        = "DOCKER"

  depends_on = [
    google_project_service.artifact_registry_api
  ]
}

# --- 3. Cloud Run Service (assumes image already exists) ---
resource "google_cloud_run_service" "webapp" {
  name     = "${var.gcp_project_id}-${var.subdomain}-service"
  location = var.gcp_region

  template {
    spec {
      containers {
        # IMPORTANT: this must match the tag you push with gcloud
        image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.app_repo.repository_id}/${var.subdomain}-app:latest"

        ports {
          container_port = 8080
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_artifact_registry_repository.app_repo,
    google_project_service.run_api
  ]
}

# --- 4. IAM – allow YOUR account to invoke Cloud Run ---
resource "google_cloud_run_service_iam_member" "invoker" {
  service  = google_cloud_run_service.webapp.name
  location = google_cloud_run_service.webapp.location
  role     = "roles/run.invoker"
  member   = var.cloud_run_invoker_member
}

# --- 5. Cloud Run Domain Mapping (asia-southeast1 supports this) ---
resource "google_cloud_run_domain_mapping" "custom_domain" {
  location = var.gcp_region
  name     = "${var.subdomain}.${var.domain_name}"
  project  = var.gcp_project_id

  metadata {
    namespace = var.gcp_project_id
  }

  spec {
    certificate_mode = "AUTOMATIC"
    route_name       = google_cloud_run_service.webapp.name
  }

  depends_on = [
    google_cloud_run_service.webapp
  ]
}

# --- 6. Azure DNS CNAME for www -> ghs.googlehosted.com ---
resource "azurerm_dns_cname_record" "google_cname" {
  name                = var.subdomain
  zone_name           = var.domain_name
  resource_group_name = var.azure_resource_group
  ttl                 = 3600
  record              = "ghs.googlehosted.com"

  tags = {
    managed_by  = "terraform"
    environment = "production"
    app         = "spendsmart-ai"
  }
}

# --- Output ---
output "webapp_url" {
  description = "Default Cloud Run URL"
  value       = google_cloud_run_service.webapp.status[0].url
}
