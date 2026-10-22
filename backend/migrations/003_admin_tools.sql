-- MySQL 8.4: tabla de auditoría administrativa, para ejecutar una vez.
CREATE TABLE IF NOT EXISTS admin_audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  resource_type VARCHAR(40) NOT NULL,
  resource_id VARCHAR(80) NULL,
  details JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT audit_actor_fk FOREIGN KEY (actor_user_id) REFERENCES app_users(id) ON DELETE SET NULL,
  KEY admin_audit_events_created_idx (created_at DESC,id DESC),
  KEY admin_audit_events_actor_idx (actor_user_id,created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
