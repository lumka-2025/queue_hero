-- Queue Hero Database Schema
-- SQLite-compatible schema with migration path to PostgreSQL/MySQL

-- Users table: Handles both customers and agents/heroes
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    user_type ENUM('customer', 'agent', 'admin') DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    -- Agent-specific fields
    agent_rating DECIMAL(3,2) DEFAULT 5.00,
    total_queues_completed INTEGER DEFAULT 0,
    current_location VARCHAR(255),
    is_available BOOLEAN DEFAULT false,
    -- Accessibility preferences
    accessibility_preferences TEXT, -- JSON: screen reader, high contrast, etc
    preferred_notification_method ENUM('sms', 'whatsapp', 'push', 'email') DEFAULT 'sms',
    -- Security and tracking
    password_hash VARCHAR(255), -- Only for agents/admins
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stores table: Physical locations where queuing happens
CREATE TABLE stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100), -- 'bank', 'mall', 'government', etc
    address TEXT NOT NULL,
    coordinates_lat DECIMAL(10, 8),
    coordinates_lng DECIMAL(11, 8),
    -- Queue characteristics
    average_service_time INTEGER DEFAULT 300, -- seconds per customer
    typical_queue_length INTEGER DEFAULT 10,
    operating_hours TEXT, -- JSON: {"monday": {"open": "09:00", "close": "17:00"}}
    -- Contact and features
    phone_number VARCHAR(15),
    wheelchair_accessible BOOLEAN DEFAULT false,
    has_priority_lane BOOLEAN DEFAULT false,
    accepts_appointments BOOLEAN DEFAULT false,
    -- Status tracking
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Queue requests: The heart of our application
CREATE TABLE queue_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    agent_id INTEGER, -- NULL until claimed by an agent
    
    -- Request details
    customer_name VARCHAR(100) NOT NULL, -- Denormalized for quick access
    customer_phone VARCHAR(15) NOT NULL, -- Denormalized for notifications
    service_needed VARCHAR(255),
    special_notes TEXT,
    priority_level INTEGER DEFAULT 1, -- 1=normal, 2=priority, 3=urgent
    
    -- Position and timing
    estimated_queue_position INTEGER,
    current_queue_position INTEGER,
    estimated_wait_time INTEGER, -- minutes
    actual_wait_time INTEGER, -- minutes (when completed)
    
    -- Status tracking
    status ENUM('pending', 'claimed', 'in_progress', 'waiting_in_line', 'being_served', 'completed', 'cancelled') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    claimed_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    
    -- Payment and feedback (future features)
    estimated_cost DECIMAL(8,2) DEFAULT 0.00,
    actual_cost DECIMAL(8,2) DEFAULT 0.00,
    customer_rating INTEGER, -- 1-5 stars
    agent_rating INTEGER, -- 1-5 stars
    
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Real-time queue status: Tracks live queue conditions at each store
CREATE TABLE queue_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    current_length INTEGER DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0, -- minutes
    last_customer_served_at DATETIME,
    is_store_open BOOLEAN DEFAULT true,
    special_conditions TEXT, -- "lunch break", "system down", etc
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(store_id) -- One status record per store
);

-- Notifications: Track all communications sent to users
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    queue_request_id INTEGER,
    
    -- Message details
    type ENUM('sms', 'whatsapp', 'push', 'email') NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    
    -- Delivery tracking
    status ENUM('pending', 'sent', 'delivered', 'failed', 'read') DEFAULT 'pending',
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    
    -- Provider details
    provider_message_id VARCHAR(255), -- Twilio SID, WhatsApp message ID, etc
    error_message TEXT,
    
    -- Accessibility
    is_accessible BOOLEAN DEFAULT true, -- Screen reader friendly formatting
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (queue_request_id) REFERENCES queue_requests(id) ON DELETE CASCADE
);

-- Agent locations: Track where agents are available to work
CREATE TABLE agent_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL,
    is_primary_location BOOLEAN DEFAULT false,
    travel_time_minutes INTEGER DEFAULT 15, -- How long to get there
    last_worked_at DATETIME,
    
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    UNIQUE(agent_id, store_id)
);

-- System logs: For debugging and analytics
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_level ENUM('debug', 'info', 'warning', 'error', 'critical') NOT NULL,
    category VARCHAR(50), -- 'queue_update', 'notification', 'auth', etc
    message TEXT NOT NULL,
    data TEXT, -- JSON for additional context
    user_id INTEGER,
    queue_request_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (queue_request_id) REFERENCES queue_requests(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_queue_requests_status ON queue_requests(status);
CREATE INDEX idx_queue_requests_store_status ON queue_requests(store_id, status);
CREATE INDEX idx_queue_requests_agent ON queue_requests(agent_id);
CREATE INDEX idx_queue_requests_customer ON queue_requests(customer_id);
CREATE INDEX idx_queue_requests_created ON queue_requests(created_at);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_type_active ON users(user_type, is_active);
CREATE INDEX idx_users_agent_available ON users(user_type, is_available) WHERE user_type = 'agent';

CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_notifications_created ON notifications(created_at);

CREATE INDEX idx_stores_active ON stores(is_active);
CREATE INDEX idx_stores_category ON stores(category);

-- Views for common queries
CREATE VIEW active_queues AS
SELECT 
    qr.*,
    s.name as store_name,
    s.address as store_address,
    u_customer.name as customer_name,
    u_agent.name as agent_name,
    u_agent.phone_number as agent_phone
FROM queue_requests qr
JOIN stores s ON qr.store_id = s.id
JOIN users u_customer ON qr.customer_id = u_customer.id
LEFT JOIN users u_agent ON qr.agent_id = u_agent.id
WHERE qr.status IN ('pending', 'claimed', 'in_progress', 'waiting_in_line', 'being_served');

CREATE VIEW available_agents AS
SELECT 
    u.*,
    COUNT(qr.id) as current_queue_count
FROM users u
LEFT JOIN queue_requests qr ON u.id = qr.agent_id AND qr.status IN ('claimed', 'in_progress', 'waiting_in_line')
WHERE u.user_type = 'agent' 
    AND u.is_active = true 
    AND u.is_available = true
GROUP BY u.id;

-- Triggers for automatic updates
CREATE TRIGGER update_user_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_store_timestamp 
    AFTER UPDATE ON stores
    BEGIN
        UPDATE stores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Sample data for development
INSERT INTO stores (name, category, address, average_service_time, typical_queue_length, wheelchair_accessible) VALUES
('First National Bank - Sandton', 'bank', '123 Sandton Drive, Sandton, Johannesburg', 420, 8, true),
('Home Affairs - Randburg', 'government', '456 Republic Road, Randburg, Johannesburg', 900, 25, true),
('Pick n Pay - Rosebank', 'retail', '789 Oxford Road, Rosebank, Johannesburg', 180, 12, true),
('Standard Bank - Fourways', 'bank', '321 William Nicol Drive, Fourways, Johannesburg', 360, 6, true);

INSERT INTO users (phone_number, name, user_type, is_active, is_available) VALUES
('+27123456789', 'John Hero', 'agent', true, true),
('+27987654321', 'Sarah Queue', 'agent', true, true),
('+27111111111', 'Admin User', 'admin', true, false);
