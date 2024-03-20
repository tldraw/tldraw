variable "metabase_db_password" {
  type      = string
  sensitive = true
}

variable "cf_worker_analytics_db_password" {
  type      = string
  sensitive = true
}

variable "cf_worker_analytics_domain" {
  type = string
}
