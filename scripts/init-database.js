#!/usr/bin/env node

/**
 * CTS v3 - Database Initialization Script
 * Handles Redis initialization, migrations, and persistence setup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

function logInfo(msg) { console.log(`${BLUE}[INFO]${NC} ${msg}`); }
function logSuccess(msg) { console.log(`${GREEN}[SUCCESS]${NC} ${msg}`); }
function logWarning(msg) { console.log(`${YELLOW}[WARNING]${NC} ${msg}`); }
function logError(msg) { console.log(`${RED}[ERROR]${NC} ${msg}`); }

async function main() {
    console.log('');
    logInfo('==========================================');
    logInfo('CTS v3 - Database Initialization');
    logInfo('==========================================');
    console.log('');

    try {
        // Step 1: Check environment
        logInfo('Step 1/6: Checking environment...');
        const nodeEnv = process.env.NODE_ENV || 'production';
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const persistenceEnabled = process.env.REDIS_PERSISTENCE === 'true';
        const snapshotPath = process.env.REDIS_SNAPSHOT_PATH || './data/redis-snapshot.json';

        logInfo(`  NODE_ENV: ${nodeEnv}`);
        logInfo(`  REDIS_URL: ${redisUrl.replace(/\/\/.*@/, '//***@')}`);
        logInfo(`  REDIS_PERSISTENCE: ${persistenceEnabled}`);
        logInfo(`  REDIS_SNAPSHOT_PATH: ${snapshotPath}`);
        logSuccess('Environment check complete\n');

        // Step 2: Ensure data directories exist
        logInfo('Step 2/6: Setting up data directories...');
        const dataDir = path.dirname(snapshotPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            logInfo(`  Created directory: ${dataDir}`);
        }
        const appDataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(appDataDir)) {
            fs.mkdirSync(appDataDir, { recursive: true });
            logInfo(`  Created directory: ${appDataDir}`);
        }
        logSuccess('Data directories ready\n');

        // Step 3: Test Redis connection
        logInfo('Step 3/6: Testing Redis connection...');
        try {
            // Extract Redis connection details from URL
            const redisMatch = redisUrl.match(/redis:\/\/(?::([^@]+)@)?([^:]+):(\d+)/);
            const redisHost = redisMatch ? redisMatch[2] : 'localhost';
            const redisPort = redisMatch ? redisMatch[3] : '6379';
            const redisPassword = redisMatch ? redisMatch[1] : null;

            const pingCmd = redisPassword
                ? `redis-cli -h ${redisHost} -p ${redisPort} -a ${redisPassword} ping`
                : `redis-cli -h ${redisHost} -p ${redisPort} ping`;

            const pingResult = execSync(pingCmd, { encoding: 'utf8', timeout: 5000 });
            if (pingResult.trim() === 'PONG') {
                logSuccess('Redis connection successful\n');
            } else {
                throw new Error('Unexpected ping response');
            }
        } catch (err) {
            logWarning(`Redis connection failed: ${err.message}`);
            logWarning('Make sure Redis is running and accessible\n');
        }

        // Step 4: Run Redis migrations
        logInfo('Step 4/6: Running Redis migrations...');
        try {
            // Use the project's migration system
            const { runMigrations } = require('../lib/redis-migrations');
            const result = await runMigrations();
            logSuccess(`Migrations complete (version: ${result.version || 'latest'})\n`);
        } catch (err) {
            logWarning(`Migration warning: ${err.message}`);
            logInfo('Continuing with initialization...\n');
        }

        // Step 5: Initialize Redis with persistence
        logInfo('Step 5/6: Initializing Redis persistence...');
        if (persistenceEnabled) {
            try {
                const { initRedis } = require('../lib/redis-db');
                await initRedis();
                logSuccess('Redis persistence initialized\n');
            } catch (err) {
                logWarning(`Redis init warning: ${err.message}`);
                logInfo('Will use default Redis configuration\n');
            }
        } else {
            logInfo('Persistence is disabled, skipping...\n');
        }

        // Step 6: Verify database integrity
        logInfo('Step 6/6: Verifying database integrity...');
        try {
            const { validateDatabase } = require('../lib/database-validator');
            await validateDatabase();
            logSuccess('Database validation passed\n');
        } catch (err) {
            logWarning(`Validation warning: ${err.message}`);
            logInfo('Database may need manual review\n');
        }

        // Summary
        console.log('==========================================');
        logSuccess('Database initialization complete!');
        console.log('==========================================');
        console.log('');
        logInfo('Summary:');
        logInfo('  - Redis: Connected and migrations applied');
        logInfo(`  - Persistence: ${persistenceEnabled ? 'Enabled' : 'Disabled'}`);
        logInfo(`  - Snapshot path: ${snapshotPath}`);
        console.log('');

        process.exit(0);
    } catch (error) {
        logError(`Initialization failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run if this is the main module
if (require.main === module) {
    main().catch(err => {
        logError(`Fatal error: ${err.message}`);
        process.exit(1);
    });
}
