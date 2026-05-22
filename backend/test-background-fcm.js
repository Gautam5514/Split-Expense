import dotenv from "dotenv";
import mongoose from "mongoose";
import admin from "./config/firebaseAdmin.js";
import User from "./models/userModel.js";

dotenv.config();

// Connect to MongoDB using your config
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🟢 Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

const runTest = async () => {
  await connectDB();

  try {
    // 1. Fetch users with registered FCM tokens
    const users = await User.find(
      { webPushTokens: { $exists: true, $not: { $size: 0 } } },
      "name email webPushTokens"
    ).lean();

    if (users.length === 0) {
      console.log("\n⚠️ No users have registered FCM tokens in the database yet!");
      console.log("💡 To register your browser device token:");
      console.log("   1. Open http://localhost:3000 in your browser and log in.");
      console.log("   2. Grant notification permission in the green 'Web Push Control Center' at the bottom-left.");
      console.log("   3. Once active, run this script again.\n");
      process.exit(0);
    }

    console.log("\n👥 Found registered browser device tokens in the database:");
    users.forEach((user, idx) => {
      console.log(`   [${idx + 1}] ${user.name} (${user.email}) - ${user.webPushTokens.length} active token(s)`);
    });

    // Default to sending to all registered test tokens
    const allTokens = users.flatMap(u => u.webPushTokens);
    const targetNames = users.map(u => u.name).join(", ");

    console.log(`\n🎯 Preparing test push alert for: ${targetNames}`);
    console.log(`📱 Target: ${allTokens.length} registered browser token(s)`);
    console.log("-----------------------------------------------------------------");
    console.log("⏳ STARTING 8-SECOND COUNTDOWN...");
    console.log("👉 ACTION REQUIRED: Close your browser tab now or minimize the window");
    console.log("   so that the notification arrives in the background (Outer notification)!");
    console.log("-----------------------------------------------------------------");

    // Countdown loop
    for (let i = 8; i > 0; i--) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`⏱️ Sending in ${i} second(s)...`);
    }

    console.log("\n🔥 Dispatching FCM Outer Push Alert...");

    const message = {
      notification: {
        title: "SplitEase Outer Notification! 🌟",
        body: "Hey there! This is a background test. Your PWA Service Worker is working flawlessly!",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        type: "group",
        link: "/dashboard",
      },
      tokens: allTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("-----------------------------------------------------------------");
    console.log(`✅ DISPATCH REPORT:`);
    console.log(`   🚀 Successfully sent: ${response.successCount}`);
    console.log(`   ❌ Failed: ${response.failureCount}`);
    console.log("-----------------------------------------------------------------");

    if (response.failureCount > 0) {
      console.log("⚠️ Some tokens failed. Cleaning up stale tokens from database...");
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            tokensToRemove.push(allTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        await User.updateMany(
          { webPushTokens: { $in: tokensToRemove } },
          { $pull: { webPushTokens: { $in: tokensToRemove } } }
        );
        console.log(`🧹 Cleaned up ${tokensToRemove.length} expired/invalid FCM web push tokens.`);
      }
    }

    console.log("🚀 Testing complete! Check your device/desktop for the push banner.");
  } catch (error) {
    console.error("❌ Test script error:", error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

runTest();
