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

# -------------------------------
# Variables
# -------------------------------
variable "gcp_project_id" {
  description = "Your Google Cloud Project ID"
  default     = "aisave4u"
}

variable "gcp_region" {
  description = "Region for Cloud Run"
  default     = "australia-southeast1"
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

# -------------------------------
# Providers
# -------------------------------
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "azurerm" {
  features {}
}

# -------------------------------
# 1. Enable Required Google APIs
# -------------------------------
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

# -------------------------------
# 2. Create Artifact Registry
# -------------------------------
resource "google_artifact_registry_repository" "app_repo" {
  location      = var.gcp_region
  repository_id = "ai-apps-repo"
  description   = "Docker repository for AI Apps"
  format        = "DOCKER"

  depends_on = [
    google_project_service.artifact_registry_api
  ]
}

# -------------------------------
# 3. Build & Push Docker Image
# -------------------------------
resource "null_resource" "docker_build" {
  # Only hash real source files, ignore Terraform internals/state
  triggers = {
    dir_sha1 = sha1(join("", [
      for f in fileset(path.module, "**") :
      filesha1(f)
      if !startswith(f, ".terraform/")
        && !startswith(f, ".git/")
        && f != "terraform.tfstate"
        && f != "terraform.tfstate.backup"
    ]))
  }

  provisioner "local-exec" {
    command = "gcloud builds submit . --tag ${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.app_repo.repository_id}/${var.subdomain}-app:latest --project ${var.gcp_project_id}"
  }

  depends_on = [
    google_artifact_registry_repository.app_repo,
    google_project_service.cloudbuild_api
  ]
}

# -------------------------------
# 4. Deploy Cloud Run Service
# -------------------------------
resource "google_cloud_run_service" "webapp" {
  # Dynamic naming: "aisave4u-www-service"
  name     = "${var.gcp_project_id}-${var.subdomain}-service"
  location = var.gcp_region

  template {
    spec {
      containers {
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
    null_resource.docker_build,
    google_project_service.run_api
  ]
}

# -------------------------------
# 5. Make Cloud Run Public
# -------------------------------
resource "google_cloud_run_service_iam_member" "public_access" {
  service  = google_cloud_run_service.webapp.name
  location = google_cloud_run_service.webapp.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -------------------------------
# 6. Cloud Run Domain Mapping
# -------------------------------
resource "google_cloud_run_domain_mapping" "custom_domain" {
  location = var.gcp_region
  name     = "${var.subdomain}.${var.domain_name}"

  metadata {
    namespace = var.gcp_project_id
  }

  spec {
    route_name = google_cloud_run_service.webapp.name
  }

  depends_on = [
    google_cloud_run_service.webapp
  ]
}

# -------------------------------
# 7. Azure DNS CNAME Record
# -------------------------------
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

# -------------------------------
# Outputs
# -------------------------------
output "webapp_url" {
  value = google_cloud_run_service.webapp.status[0].url
}
