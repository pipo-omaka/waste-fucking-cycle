/**
 * Script to delete ALL posts from Firestore database
 * 
 * Usage:
 * 1. cd server
 * 2. node scripts/delete-all-posts.js
 * 
 * ⚠️ WARNING: This will permanently delete ALL posts in the database!
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db;

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
    path.join(__dirname, '../waste-cycle-a6c6e-20e57e12a03a.json');
  
  const serviceAccountJson = readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  initializeApp({
    credential: cert(serviceAccount),
  });
  
  db = getFirestore();
  console.log('✅ Firebase Admin initialized successfully');
  console.log(`   Project ID: ${serviceAccount.project_id}`);
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.error('\n📝 Please ensure the service account key file exists');
  process.exit(1);
}

/**
 * Delete all documents from a collection in batches
 */
async function deleteCollection(collectionName, batchSize = 100) {
  const collectionRef = db.collection(collectionName);
  
  let deletedCount = 0;
  let hasMore = true;
  
  while (hasMore) {
    const snapshot = await collectionRef.limit(batchSize).get();
    
    if (snapshot.empty) {
      hasMore = false;
      break;
    }
    
    // Delete documents in batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedCount++;
    });
    
    await batch.commit();
    console.log(`   Deleted ${deletedCount} documents...`);
    
    // If we got fewer documents than batch size, we're done
    if (snapshot.size < batchSize) {
      hasMore = false;
    }
  }
  
  return deletedCount;
}

/**
 * Main function
 */
async function main() {
  console.log('🗑️  DELETE ALL POSTS SCRIPT\n');
  console.log('⚠️  WARNING: This will permanently delete ALL posts from the database!');
  console.log('⚠️  This action CANNOT be undone!\n');
  
  try {
    // Count existing posts first
    console.log('📊 Counting existing posts...');
    const postsSnapshot = await db.collection('products').get();
    const totalPosts = postsSnapshot.size;
    
    console.log(`   Found ${totalPosts} posts in database\n`);
    
    if (totalPosts === 0) {
      console.log('✅ No posts to delete. Database is already clean.');
      return;
    }
    
    // Delete all posts
    console.log('🗑️  Deleting all posts from "products" collection...');
    const deletedCount = await deleteCollection('products');
    
    console.log(`\n✅ Successfully deleted ${deletedCount} posts!`);
    console.log('\n📝 Database is now clean.');
    console.log('   Users can now create new posts from scratch.');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
