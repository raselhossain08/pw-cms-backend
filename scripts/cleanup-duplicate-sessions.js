/**
 * Cleanup Script for Duplicate Bot Conversation Sessions
 * 
 * This script identifies and removes duplicate sessionId entries in the botconversations collection.
 * It keeps the oldest conversation and removes duplicates.
 * 
 * Usage:
 *   node scripts/cleanup-duplicate-sessions.js
 * 
 * Make sure to backup your database before running this script!
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Bot Conversation Schema (simplified for cleanup)
const botConversationSchema = new mongoose.Schema({
  sessionId: String,
  userId: mongoose.Schema.Types.ObjectId,
  messages: Array,
  status: String,
  createdAt: Date,
  updatedAt: Date,
});

const BotConversation = mongoose.model('BotConversation', botConversationSchema);

async function findDuplicates() {
  console.log('🔍 Searching for duplicate sessions...\n');

  const duplicates = await BotConversation.aggregate([
    {
      $group: {
        _id: '$sessionId',
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        userIds: { $push: '$userId' },
        createdAts: { $push: '$createdAt' },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  return duplicates;
}

async function cleanupDuplicates(dryRun = true) {
  console.log('🚀 Starting duplicate session cleanup...');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚠️  LIVE (will delete duplicates)'}\n`);

  if (!dryRun) {
    console.log('⚠️  WARNING: This will permanently delete duplicate sessions!');
    console.log('⚠️  Make sure you have a database backup!\n');
  }

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/personal-wings';
    console.log(`📡 Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    const duplicates = await findDuplicates();

    if (duplicates.length === 0) {
      console.log('✅ No duplicate sessions found! Database is clean.\n');
      return;
    }

    console.log(`📊 Found ${duplicates.length} duplicate sessionIds\n`);

    let totalDuplicates = 0;
    let deletedCount = 0;

    for (const dup of duplicates) {
      const duplicateCount = dup.count - 1; // Subtract 1 because we keep the oldest
      totalDuplicates += duplicateCount;

      console.log(`\n📝 SessionId: ${dup._id}`);
      console.log(`   Occurrences: ${dup.count}`);
      console.log(`   Will keep: oldest conversation`);
      console.log(`   Will remove: ${duplicateCount} duplicate(s)`);

      // Get full conversation details
      const conversations = await BotConversation.find({
        sessionId: dup._id,
      }).sort({ createdAt: 1 });

      // Display details
      conversations.forEach((conv, index) => {
        const status = index === 0 ? '✅ KEEP' : '❌ DELETE';
        console.log(`   [${index + 1}] ${status} - User: ${conv.userId}, Created: ${conv.createdAt}, Messages: ${conv.messages?.length || 0}`);
      });

      if (!dryRun) {
        // Keep the oldest (first), delete the rest
        const toDelete = conversations.slice(1).map((c) => c._id);
        
        if (toDelete.length > 0) {
          const result = await BotConversation.deleteMany({
            _id: { $in: toDelete },
          });
          deletedCount += result.deletedCount;
          console.log(`   ✅ Deleted ${result.deletedCount} duplicate(s)`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total duplicate sessionIds found: ${duplicates.length}`);
    console.log(`Total duplicate entries: ${totalDuplicates}`);
    
    if (dryRun) {
      console.log(`Would delete: ${totalDuplicates} conversation(s)`);
      console.log('\n💡 To perform actual cleanup, run:');
      console.log('   node scripts/cleanup-duplicate-sessions.js --live');
    } else {
      console.log(`Deleted: ${deletedCount} conversation(s)`);
      console.log('\n✅ Cleanup completed successfully!');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the cleanup
const args = process.argv.slice(2);
const isLiveMode = args.includes('--live') || args.includes('-l');
const isDryRun = !isLiveMode;

cleanupDuplicates(isDryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

