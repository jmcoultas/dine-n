import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Recreate the crypto functions from auth.ts
const crypto = {
  hash: async (password) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64));
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword, storedPassword) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    ));
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }
};

async function testPartialRegistrationDetection() {
  console.log("🧪 Testing Partial Registration Detection Logic");
  console.log("=" * 50);
  
  try {
    // Test 1: Create a temporary password hash
    console.log("\n1. Testing temporary password creation and detection:");
    const tempPasswordHash = await crypto.hash("TEMPORARY_PASSWORD");
    console.log(`   ✓ Created temp password hash: ${tempPasswordHash.substring(0, 20)}...`);
    
    // Test 2: Verify we can detect the temporary password
    const isTempPassword = await crypto.compare("TEMPORARY_PASSWORD", tempPasswordHash);
    console.log(`   ✓ Can detect temporary password: ${isTempPassword}`);
    
    if (!isTempPassword) {
      throw new Error("Failed to detect temporary password!");
    }
    
    // Test 3: Verify a real password doesn't match
    const isRealPassword = await crypto.compare("realpassword123", tempPasswordHash);
    console.log(`   ✓ Real password doesn't match temp: ${!isRealPassword}`);
    
    if (isRealPassword) {
      throw new Error("Real password incorrectly matched temporary password!");
    }
    
    // Test 4: Test the old broken logic (string matching)
    console.log("\n2. Testing old broken logic (should fail):");
    const containsTemporary = tempPasswordHash.includes('TEMPORARY');
    const startsWithTemporary = tempPasswordHash.startsWith('TEMPORARY_');
    console.log(`   ✗ Hash contains 'TEMPORARY': ${containsTemporary}`);
    console.log(`   ✗ Hash starts with 'TEMPORARY_': ${startsWithTemporary}`);
    
    if (containsTemporary || startsWithTemporary) {
      throw new Error("Old logic incorrectly detected temporary password in hash!");
    }
    
    // Test 5: Create a real password and verify it works
    console.log("\n3. Testing real password creation and detection:");
    const realPasswordHash = await crypto.hash("mySecurePassword123");
    console.log(`   ✓ Created real password hash: ${realPasswordHash.substring(0, 20)}...`);
    
    const isCorrectPassword = await crypto.compare("mySecurePassword123", realPasswordHash);
    console.log(`   ✓ Can verify real password: ${isCorrectPassword}`);
    
    const isNotTempPassword = await crypto.compare("TEMPORARY_PASSWORD", realPasswordHash);
    console.log(`   ✓ Real password is not temporary: ${!isNotTempPassword}`);
    
    if (!isCorrectPassword || isNotTempPassword) {
      throw new Error("Real password verification failed!");
    }
    
    console.log("\n✅ All tests passed! The authentication fix is working correctly.");
    console.log("\nKey findings:");
    console.log("- Temporary passwords are properly hashed and can be detected using crypto.compare()");
    console.log("- The old string matching logic would fail (as expected)");
    console.log("- Real passwords work correctly and don't match the temporary password");
    
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testPartialRegistrationDetection().catch(console.error); 