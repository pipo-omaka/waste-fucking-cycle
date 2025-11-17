// server/src/config/firebaseConfig.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let firebaseApp;
let detectedProjectId = null;

try {
  // Initialize Firebase Admin SDK
  // Option 1: Use Service Account Key file (recommended for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    // Handle both absolute and relative paths
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH.startsWith('.')
      ? join(__dirname, '..', '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    try {
      const serviceAccount = JSON.parse(
        readFileSync(serviceAccountPath, 'utf8')
      );
      
      // Validate service account structure
      if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
        throw new Error('Invalid service account file: missing required fields (private_key, client_email, or project_id)');
      }
      
      // Validate private key format
      if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY') || !serviceAccount.private_key.includes('END PRIVATE KEY')) {
        throw new Error('Invalid service account file: private_key format is incorrect');
      }
      
      detectedProjectId = serviceAccount.project_id;
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      
      console.log('✅ Firebase initialized with service account file');
      console.log(`📁 Project ID: ${detectedProjectId}`);
      console.log(`📧 Service Account: ${serviceAccount.client_email}`);
    } catch (fileError) {
      console.warn(`⚠️  Could not read service account file: ${fileError.message}`);
      throw fileError;
    }
  } 
  // Option 2: Try to find service account file in common locations
  else {
    const possibleDirs = [
      join(__dirname, '..', '..'),
      join(__dirname, '..', '..', '..', 'client', 'src'),
    ];
    
    let serviceAccountPath = null;
    for (const dir of possibleDirs) {
      try {
        const files = readdirSync(dir);
        // Look for Firebase service account files - they can have different naming patterns:
        // 1. Contains 'firebase-adminsdk' (standard pattern)
        // 2. Starts with project ID 'waste-cycle-a6c6e' and ends with '.json' (alternative pattern)
        // 3. Matches pattern: project-id-hex.json (e.g., waste-cycle-a6c6e-20e57e12a03a.json)
        const serviceAccountFile = files.find(file => 
          file.endsWith('.json') && 
          !file.includes('package') && 
          !file.includes('package-lock') &&
          (
            file.includes('firebase-adminsdk') || 
            file.startsWith('waste-cycle-a6c6e-') ||
            file.match(/^[a-z0-9-]+-[a-f0-9]+\.json$/) // Pattern: project-id-hex.json
          )
        );
        if (serviceAccountFile) {
          serviceAccountPath = join(dir, serviceAccountFile);
          console.log(`🔍 Found service account file: ${serviceAccountFile}`);
          break;
        }
      } catch (e) {
        // Directory doesn't exist, try next directory
        console.log(`⚠️  Could not search directory ${dir}: ${e.message}`);
      }
    }
    
    if (serviceAccountPath) {
      const serviceAccount = JSON.parse(
        readFileSync(serviceAccountPath, 'utf8')
      );
      
      // Validate service account structure
      if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
        throw new Error('Invalid service account file: missing required fields (private_key, client_email, or project_id)');
      }
      
      // Validate private key format
      if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY') || !serviceAccount.private_key.includes('END PRIVATE KEY')) {
        throw new Error('Invalid service account file: private_key format is incorrect');
      }
      
      detectedProjectId = serviceAccount.project_id;
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`
      });
      
      console.log('✅ Firebase initialized with service account file (auto-detected)');
      console.log(`📁 Project ID: ${detectedProjectId}`);
      console.log(`📧 Service Account: ${serviceAccount.client_email}`);
    }
    // Option 3: Use environment variables (for development/deployment)
    else if (process.env.FIREBASE_PROJECT_ID) {
      detectedProjectId = process.env.FIREBASE_PROJECT_ID;
      
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      
      console.log('✅ Firebase initialized with environment variables');
      console.log(`📁 Project ID: ${detectedProjectId}`);
    } else {
      console.error('\n❌ Firebase Admin SDK Configuration Required\n');
      console.error('To run the backend server, you need Firebase Admin SDK credentials.\n');
      console.error('📋 Option 1: Download Service Account JSON (Recommended)');
      console.error('   1. Go to: https://console.firebase.google.com/project/waste-cycle-a6c6e/settings/serviceaccounts/adminsdk');
      console.error('   2. Click "Generate new private key"');
      console.error('   3. Download the JSON file');
      console.error('   4. Place it in: ' + join(__dirname, '..', '..'));
      console.error('   5. The file should be named: waste-cycle-a6c6e-firebase-adminsdk-*.json\n');
      console.error('📋 Option 2: Use Environment Variables');
      console.error('   Create a .env file in the server directory with:');
      console.error('   FIREBASE_PROJECT_ID=waste-cycle-a6c6e');
      console.error('   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@waste-cycle-a6c6e.iam.gserviceaccount.com');
      console.error('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
      console.error('   FIREBASE_STORAGE_BUCKET=waste-cycle-a6c6e.firebasestorage.app\n');
      console.error('⚠️  MOCK_AUTH mode has been REMOVED - Firebase Auth is REQUIRED\n');
      throw new Error('Firebase configuration not found. See instructions above.');
    }
  }

  console.log('🔥 Firebase Admin SDK initialized successfully');
  
  // CRITICAL: Validate project ID matches expected value
  if (detectedProjectId !== 'waste-cycle-a6c6e') {
    console.error(`\n❌ CRITICAL: Backend Project ID mismatch!`);
    console.error(`   Expected: waste-cycle-a6c6e`);
    console.error(`   Got: ${detectedProjectId}`);
    console.error(`   This will cause verifyIdToken() to fail!\n`);
  } else {
    console.log(`✅ Project ID validated: ${detectedProjectId}`);
  }
} catch (error) {
  // Firebase is REQUIRED - no MOCK_AUTH fallback
  console.error('\n❌ Firebase initialization error:', error.message);
  console.error('⚠️  MOCK_AUTH mode has been REMOVED - Firebase Auth is REQUIRED\n');
  
  // Check for specific error types
  if (error.message && error.message.includes('Invalid JWT Signature')) {
    console.error('🔑 Service Account Key Error Detected:');
    console.error('   The service account key appears to be invalid or revoked.');
    console.error('\n📋 Solution:');
    console.error('   1. Go to: https://console.firebase.google.com/project/waste-cycle-a6c6e/settings/serviceaccounts/adminsdk');
    console.error('   2. Check if the key ID is still present in the service accounts list');
    console.error('   3. If not, or if you see "Revoked" status:');
    console.error('      → Click "Generate new private key"');
    console.error('      → Download the new JSON file');
    console.error('      → Replace: waste-cycle-a6c6e-firebase-adminsdk-*.json');
    console.error('   4. Restart the server\n');
  } else if (error.message && error.message.includes('invalid_grant')) {
    console.error('🔑 Service Account Key Error:');
    console.error('   The service account key has been revoked or is invalid.');
    console.error('\n📋 Solution:');
    console.error('   1. Generate a new service account key from Firebase Console');
    console.error('   2. Replace the existing JSON file with the new one');
    console.error('   3. Restart the server\n');
  } else if (error.code === 'ENOENT' || error.message.includes('Cannot find module')) {
    console.error('📁 Service Account File Not Found');
    console.error('   Please ensure the service account JSON file exists in the server directory.\n');
  }
  
  process.exit(1);
}

// Export Firebase services
let db, auth, storage, bucket, messaging;
if (firebaseApp) {
  try {
    db = admin.firestore();
    auth = admin.auth();
    storage = admin.storage();
    bucket = storage.bucket();
    messaging = admin.messaging();
    console.log('✅ Firebase services initialized (Firestore, Auth, Storage, Messaging)');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase services:', error.message);
    throw error;
  }
} else {
  // Firebase not initialized - this should not happen
  console.error('❌ Firebase app not initialized');
  process.exit(1);
}

// Export detected project ID for validation
export { db, auth, storage, bucket, messaging, detectedProjectId };
export default admin;
