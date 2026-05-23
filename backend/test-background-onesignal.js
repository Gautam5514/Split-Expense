import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/userModel.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`\n🟢 Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1);
  }
};

const runTest = async () => {
  await connectDB();

  try {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      console.error("\n❌ ERROR: OneSignal credentials are not configured in your backend .env file!");
      console.log("👉 Please make sure you have added these to backend/.env:");
      console.log("   ONESIGNAL_APP_ID=02daf88c-91e8-4e23-a8d3-4e2d07c19c95");
      console.log("   ONESIGNAL_REST_API_KEY=your_rest_api_key_here\n");
      process.exit(1);
    }

    // 1. Fetch users with registered OneSignal subscription IDs
    const users = await User.find(
      { oneSignalSubscriptionIds: { $exists: true, $not: { $size: 0 } } },
      "name email oneSignalSubscriptionIds"
    ).lean();

    if (users.length === 0) {
      console.log("\n⚠️ No users have registered OneSignal push subscriptions in the database yet!");
      console.log("💡 To register your browser device:");
      console.log("   1. Open http://localhost:3000 in your browser and log in.");
      console.log("   2. Go to your Profile page.");
      console.log("   3. Click the 'Enable Push Notifications' button in the settings card.");
      console.log("   4. Once registered successfully, run this script again.\n");
      process.exit(0);
    }

    console.log("\n👥 Found registered browser push subscriptions in the database:");
    users.forEach((user, idx) => {
      console.log(`   [${idx + 1}] ${user.name} (${user.email}) - ${user.oneSignalSubscriptionIds.length} subscription(s)`);
    });

    const allSubscriptionIds = users.flatMap(u => u.oneSignalSubscriptionIds);
    const targetNames = users.map(u => u.name).join(", ");

    console.log(`\n🎯 Preparing background push alert for: ${targetNames}`);
    console.log(`📱 Target: ${allSubscriptionIds.length} registered subscription ID(s)`);
    console.log("-----------------------------------------------------------------");
    console.log("⏳ STARTING 8-SECOND COUNTDOWN...");
    console.log("👉 ACTION REQUIRED: Close your browser tab now or minimize the window");
    console.log("   so that the notification arrives in the background (outer notification)!");
    console.log("-----------------------------------------------------------------");

    // Countdown loop
    for (let i = 8; i > 0; i--) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`⏱️ Sending in ${i} second(s)...`);
    }

    console.log("\n🔥 Dispatching OneSignal Background Push Alert...");

    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: allSubscriptionIds,
        headings: {
          en: "SplitEase Outer Notification! 🌟"
        },
        contents: {
          en: "Hey there! This is a closed-tab background test. Your OneSignal Service Worker is working flawlessly!"
        },
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      })
    });

    const data = await response.json();

    console.log("-----------------------------------------------------------------");
    console.log(`✅ DISPATCH REPORT:`);
    if (response.ok) {
      console.log(`   🚀 Successfully sent! OneSignal Response:`, data);
    } else {
      console.log(`   ❌ OneSignal API Error:`, data);
    }
    console.log("-----------------------------------------------------------------");
    console.log("🚀 Testing complete! Check your device/desktop for the push banner.");
  } catch (error) {
    console.error("❌ Test script error:", error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

runTest();
