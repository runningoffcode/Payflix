"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.getDatabase = getDatabase;
exports.initializeDatabase = initializeDatabase;
const config_1 = __importDefault(require("../config"));
const postgres_1 = require("./postgres");
const index_1 = require("./index");
const supabase_1 = require("./supabase");
/**
 * Get database instance
 */
function getDatabase() {
    if (config_1.default.database.useSupabase) {
        console.log('📦 Using Supabase database (PostgreSQL hosted)');
        return supabase_1.db;
    }
    else if (config_1.default.database.usePostgres) {
        console.log('📊 Using PostgreSQL database');
        return postgres_1.postgresDb;
    }
    else {
        console.log('💾 Using in-memory database (development mode)');
        return index_1.db;
    }
}
/**
 * Initialize database
 */
async function initializeDatabase() {
    const database = getDatabase();
    if (database.initialize) {
        await database.initialize();
    }
    // Initialize sample data for development (only for in-memory)
    if (!config_1.default.database.usePostgres && !config_1.default.database.useSupabase && database.initializeSampleData) {
        await database.initializeSampleData();
    }
}
// Export singleton instance
exports.db = getDatabase();
