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
            
            //