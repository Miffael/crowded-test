CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('admin', 'operator');
CREATE TYPE user_status AS ENUM ('active', 'blocked', 'deleted');

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password_hash, role, status)
VALUES ('admin@example.com', '$2b$10$qirbrb3HaFcP0P4N6ZuskemZSIxV50ARd52MQTO2lKReUrTUrmBiy', 'admin', 'active');
