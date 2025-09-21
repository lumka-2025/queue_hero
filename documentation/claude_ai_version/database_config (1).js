const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
    constructor() {
        // Determine database path based on environment
        const dbName = process.env.NODE_ENV === 'test' ? 'queue_hero_test.db' : 'queue_hero.db';
        this.dbPath = path.join(__dirname, '..', 'database', dbName);
        this.db = null;
        
        // Connection pool settings for better performance
        this.maxConnections = process.env.DB_MAX_CONNECTIONS || 10;
        this.currentConnections = 0;
    }

    /**
     * Initialize the database connection and create tables if they don't exist
     */
    async initialize() {
        try {
            // Ensure the database directory exists
            const dbDir = path.dirname(this.dbPath);
            await fs.mkdir(dbDir, { recursive: true });
            
            // Create database connection
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    throw err;
                }
                console.log('Connected to SQLite database');
            });
            
            // Configure SQLite for better performance and reliability
            await this.runQuery('PRAGMA foreign_keys = ON'); // Enable foreign key constraints
            await this.runQuery('PRAGMA journal_mode = WAL'); // Write-Ahead Logging for better concurrency
            await this.runQuery('PRAGMA synchronous = NORMAL'); // Good balance of safety and speed
            await this.runQuery('PRAGMA cache_size = 1000'); // Cache more pages in memory
            await this.runQuery('PRAGMA temp_store = MEMORY'); // Store temporary tables in memory
            
            // Create tables if they don't exist
            await this.createTables();
            
            console.log('Database initialization completed successfully');
            
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Create all required tables from schema
     */
    async createTables() {
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        
        try {
            const schema = await fs.readFile(schemaPath, 'utf8');
            // Split schema into individual statements (basic approach)
            const statements = schema
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            for (const statement of statements) {
                if (statement.trim()) {
                    await this.runQuery(statement);
                }
            }
            
            console.log('Database tables created successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    /**
     * Run a single query with parameters
     * @param {string} query - SQL query string
     * @param {Array} params - Parameters for the query
     * @returns {Promise} - Promise that resolves with query result
     */
    runQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    console.error('Database query error:', err.message);
                    console.error('Query:', query);
                    console.error('Params:', params);
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    /**
     * Get a single row from the database
     * @param {string} query - SQL query string
     * @param {Array} params - Parameters for the query
     * @returns {Promise} - Promise that resolves with the first row or null
     */
    getRow(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    console.error('Database query error:', err.message);
                    console.error('Query:', query);
                    console.error('Params:', params);
                    reject(err);
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    /**
     * Get multiple rows from the database
     * @param {string} query - SQL query string
     * @param {Array} params - Parameters for the query
     * @returns {Promise} - Promise that resolves with an array of rows
     */
    getRows(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('Database query error:', err.message);
                    console.error('Query:', query);
                    console.error('Params:', params);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Execute a transaction with multiple queries
     * @param {Function} callback - Function that receives the db instance for transactions
     * @returns {Promise} - Promise that resolves when transaction completes
     */
    async transaction(callback) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                try {
                    const result = callback(this.db);
                    
                    if (result instanceof Promise) {
                        result
                            .then((data) => {
                                this.db.run('COMMIT', (err) => {
                                    if (err) reject(err);
                                    else resolve(data);
                                });
                            })
                            .catch((error) => {
                                this.db.run('ROLLBACK');
                                reject(error);
                            });
                    } else {
                        this.db.run('COMMIT', (err) => {
                            if (err) reject(err);
                            else resolve(result);
                        });
                    }
                } catch (error) {
                    this.db.run('ROLLBACK');
                    reject(error);
                }
            });
        });
    }

    /**
     * Create a user (customer, agent, or admin)
     * @param {Object} userData - User data object
     * @returns {Promise} - Promise that resolves with the created user
     */
    async createUser(userData) {
        const {
            phone_number,
            name,
            email = null,
            user_type = 'customer',
            password_hash = null,
            accessibility_preferences = null,
            preferred_notification_method = 'sms'
        } = userData;

        const query = `
            INSERT INTO users (
                phone_number, name, email, user_type, password_hash,
                accessibility_preferences, preferred_notification_method
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            const result = await this.runQuery(query, [
                phone_number,
                name,
                email,
                user_type,
                password_hash,
                accessibility_preferences ? JSON.stringify(accessibility_preferences) : null,
                preferred_notification_method
            ]);

            return await this.getUserById(result.id);
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('Phone number already exists');
            }
            throw error;
        }
    }

    /**
     * Get user by ID
     * @param {number} userId - User ID
     * @returns {Promise} - Promise that resolves with user data
     */
    async getUserById(userId) {
        const query = 'SELECT * FROM users WHERE id = ? AND is_active = true';
        const user = await this.getRow(query, [userId]);
        
        if (user && user.accessibility_preferences) {
            try {
                user.accessibility_preferences = JSON.parse(user.accessibility_preferences);
            } catch (e) {
                user.accessibility_preferences = null;
            }
        }
        
        return user;
    }

    /**
     * Get user by phone number
     * @param {string} phoneNumber - Phone number
     * @returns {Promise} - Promise that resolves with user data
     */
    async getUserByPhone(phoneNumber) {
        const query = 'SELECT * FROM users WHERE phone_number = ? AND is_active = true';
        const user = await this.getRow(query, [phoneNumber]);
        
        if (user && user.accessibility_preferences) {
            try {
                user.accessibility_preferences = JSON.parse(user.accessibility_preferences);
            } catch (e) {
                user.accessibility_preferences = null;
            }
        }
        
        return user;
    }

    /**
     * Create a queue request
     * @param {Object} queueData - Queue request data
     * @returns {Promise} - Promise that resolves with the created queue request
     */
    async createQueueRequest(queueData) {
        const {
            customer_id,
            store_id,
            customer_name,
            customer_phone,
            service_needed = null,
            special_notes = null,
            priority_level = 1
        } = queueData;

        const query = `
            INSERT INTO queue_requests (
                customer_id, store_id, customer_name, customer_phone,
                service_needed, special_notes, priority_level, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        try {
            const result = await this.runQuery(query, [
                customer_id,
                store_id,
                customer_name,
                customer_phone,
                service_needed,
                special_notes,
                priority_level
            ]);

            return await this.getQueueRequestById(result.id);
        } catch (error) {
            console.error('Error creating queue request:', error);
            throw error;
        }
    }

    /**
     * Get queue request by ID with related data
     * @param {number} queueId - Queue request ID
     * @returns {Promise} - Promise that resolves with queue request data
     */
    async getQueueRequestById(queueId) {
        const query = `
            SELECT 
                qr.*,
                s.name as store_name,
                s.address as store_address,
                s.average_service_time,
                u_agent.name as agent_name,
                u_agent.phone_number as agent_phone
            FROM queue_requests qr
            JOIN stores s ON qr.store_id = s.id
            LEFT JOIN users u_agent ON qr.agent_id = u_agent.id
            WHERE qr.id = ?
        `;

        return await this.getRow(query, [queueId]);
    }

    /**
     * Get all active stores
     * @returns {Promise} - Promise that resolves with array of stores
     */
    async getActiveStores() {
        const query = `
            SELECT 
                s.*,
                qs.current_length,
                qs.average_wait_time,
                qs.is_store_open
            FROM stores s
            LEFT JOIN queue_status qs ON s.id = qs.store_id
            WHERE s.is_active = true
            ORDER BY s.name
        `;

        const stores = await this.getRows(query);
        
        return stores.map(store => {
            if (store.operating_hours) {
                try {
                    store.operating_hours = JSON.parse(store.operating_hours);
                } catch (e) {
                    store.operating_hours = null;
                }
            }
            return store;
        });
    }

    /**
     * Update queue request status
     * @param {number} queueId - Queue request ID
     * @param {string} status - New status
     * @param {number} agentId - Agent ID (optional)
     * @returns {Promise} - Promise that resolves with update result
     */
    async updateQueueStatus(queueId, status, agentId = null) {
        let query = 'UPDATE queue_requests SET status = ?';
        let params = [status];

        if (agentId !== null) {
            query += ', agent_id = ?';
            params.push(agentId);
        }

        // Set timestamps based on status
        if (status === 'claimed') {
            query += ', claimed_at = CURRENT_TIMESTAMP';
        } else if (status === 'in_progress') {
            query += ', started_at = CURRENT_TIMESTAMP';
        } else if (status === 'completed' || status === 'cancelled') {
            query += ', completed_at = CURRENT_TIMESTAMP';
        }

        query += ' WHERE id = ?';
        params.push(queueId);

        return await this.runQuery(query, params);
    }

    /**
     * Get available agents for a specific store
     * @param {number} storeId - Store ID
     * @returns {Promise} - Promise that resolves with array of available agents
     */
    async getAvailableAgents(storeId) {
        const query = `
            SELECT 
                u.*,
                al.travel_time_minutes,
                COUNT(qr.id) as current_queue_count
            FROM users u
            LEFT JOIN agent_locations al ON u.id = al.agent_id AND al.store_id = ?
            LEFT JOIN queue_requests qr ON u.id = qr.agent_id 
                AND qr.status IN ('claimed', 'in_progress', 'waiting_in_line')
            WHERE u.user_type = 'agent' 
                AND u.is_active = true 
                AND u.is_available = true
            GROUP BY u.id
            ORDER BY current_queue_count ASC, al.travel_time_minutes ASC
        `;

        return await this.getRows(query, [storeId]);
    }

    /**
     * Log system events for debugging and analytics
     * @param {Object} logData - Log entry data
     * @returns {Promise} - Promise that resolves when log is saved
     */
    async logEvent(logData) {
        const {
            log_level,
            category,
            message,
            data = null,
            user_id = null,
            queue_request_id = null,
            ip_address = null,
            user_agent = null
        } = logData;

        const query = `
            INSERT INTO system_logs (
                log_level, category, message, data, user_id, 
                queue_request_id, ip_address, user_agent
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return await this.runQuery(query, [
            log_level,
            category,
            message,
            data ? JSON.stringify(data) : null,
            user_id,
            queue_request_id,
            ip_address,
            user_agent
        ]);
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed.');
                }
            });
        }
    }

    /**
     * Check if database connection is healthy
     * @returns {Promise} - Promise that resolves with connection status
     */
    async healthCheck() {
        try {
            await this.getRow('SELECT 1 as test');
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }
}

// Create and export a singleton instance
const database = new Database();

module.exports = database;