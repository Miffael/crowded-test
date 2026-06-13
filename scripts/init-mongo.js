// Initialize database and collections for BaaS Payments & Balance Projection
db = db.getSiblingDB('baas_payments');

print('Starting MongoDB database initialization...');

// Define collections to create
const collections = ['customers', 'accounts', 'payments', 'webhook_events'];

collections.forEach((collectionName) => {
  if (!db.getCollectionNames().includes(collectionName)) {
    db.createCollection(collectionName);
    print(`Collection '${collectionName}' created.`);
  } else {
    print(`Collection '${collectionName}' already exists.`);
  }
});

// Create indexes
print('Creating indexes...');

// Customers
db.customers.createIndex({ customerId: 1 }, { unique: true });
print('Index created: customers (customerId [unique])');

// Accounts
db.accounts.createIndex({ accountId: 1 }, { unique: true });
db.accounts.createIndex({ customerId: 1 });
print('Indexes created: accounts (accountId [unique], customerId)');

// Payments
db.payments.createIndex({ paymentId: 1 }, { unique: true });
db.payments.createIndex({ accountId: 1 });
db.payments.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
print('Indexes created: payments (paymentId [unique], accountId, idempotencyKey [unique, sparse])');

// Webhook events (for idempotency and deduplication)
db.webhook_events.createIndex({ provider: 1, eventId: 1 }, { unique: true });
print('Index created: webhook_events (provider, eventId [unique])');

print('MongoDB initialization completed successfully.');
