import { MongoClient } from 'mongodb';

class Database {
    constructor() {
        const { WG_GUI_ENV, DB_HOSTNAME, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = process.env;
        if (WG_GUI_ENV === 'PROD') {
            if (!DB_HOSTNAME || !DB_PORT || !DB_NAME || !DB_USERNAME || !DB_PASSWORD) {
                throw new Error('Missing required environment variables for database connection');
            }
            this.DB_HOSTNAME = DB_HOSTNAME;
            this.DB_PORT = DB_PORT;
            this.DB_NAME = DB_NAME;
            this.DB_USERNAME = DB_USERNAME;
            this.DB_PASSWORD = DB_PASSWORD;
        } else {
            this.DB_HOSTNAME = 'localhost';
            this.DB_PORT = 27017;
            this.DB_NAME = 'general';
            this.DB_USERNAME = 'admin';
            this.DB_PASSWORD = 'admin';
        }

        this.uri = `mongodb://${this.DB_USERNAME}:${this.DB_PASSWORD}@${this.DB_HOSTNAME}:${this.DB_PORT}/${this.DB_NAME}`;
        this.client = null;
        this.db = null;
    }

    async connectDB() {
        if (!this.client) {
            this.client = new MongoClient(this.uri, {
                serverSelectionTimeoutMS: 1000,
            });
        }
        try {
            await this.client.connect();
            this.db = this.client.db(this.DB_NAME);
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('Error connecting to MongoDB:', error);
            throw error;
        }
    }

    async closeDB() {
        if (this.client) {
            await this.client.close();
            this.db = null;
            this.client = null;
            console.log('MongoDB connection closed');
        }
    }

    async getDB() {
        await this.ensureConnection(); // Check and connect if necessary
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        return this.db;
    }

    async getCollection(collectionName) {
        const db = await this.getDB(); // Ensure connection before getting collection
        return db.collection(collectionName);
    }

    async ensureConnection() {
        if (!this.db) {
            await this.connectDB(); // Ensure we're connected to the DB
        }
    }
}

// Export an instance of the Database class
const database = new Database();

export const connectDB = () => database.connectDB();
export const getDB = () => database.getDB();
export const getCollection = (collectionName) => database.getCollection(collectionName);
export const closeDB = () => database.closeDB();
