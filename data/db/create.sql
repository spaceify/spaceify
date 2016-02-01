CREATE TABLE applications(unique_name TEXT NOT NULL PRIMARY KEY, unique_directory TEXT, docker_image_id TEXT, type TEXT, version TEXT, inject_identifier TEXT DEFAULT NULL, install_datetime TEXT, inject_enabled INTEGER DEFAULT 0);
CREATE TABLE provided_services(unique_name TEXT, service_name TEXT, service_type TEXT);
CREATE TABLE inject_hostnames(unique_name TEXT, inject_hostname TEXT);
CREATE TABLE inject_files(unique_name TEXT, url_or_path TEXT, directory TEXT DEFAULT NULL, file TEXT, inject_type TEXT, inject_order INTEGER);
CREATE TABLE user(edge_id TEXT NOT NULL PRIMARY KEY, edge_password TEXT, admin_password_hash TEXT, admin_salt TEXT, admin_login_count INTEGER DEFAULT 0, admin_last_login INTEGER DEFAULT 0);
CREATE TABLE settings(language TEXT DEFAULT 'en_US', splash_ttl INTEGER DEFAULT 3600000, session_ttl INTEGER DEFAULT 86400000, db_version INTEGER, release_name TEXT, release_version TEXT);
INSERT INTO settings VALUES('en_US', 3600000, 86400000, 4, 'Alpha Centauri', '0.1.0');
