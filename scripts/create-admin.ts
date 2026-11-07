
import { loadEnvConfig } from "@next/env";

// Load environment variables BEFORE importing application modules.
loadEnvConfig(process.cwd());

async function createAdmin() {
  try {
    const { connectDB } = await import("../src/lib/mongodb");
    const Admin = (await import("../src/models/Admin")).default;
    const bcrypt = await import("bcryptjs");
    const mongoose = (await import("mongoose")).default;

    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      throw new Error(
        "Please configure ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in .env.local"
      );
    }

    if (password.length < 12) {
      throw new Error("Admin password must contain at least 12 characters.");
    }

    await connectDB();

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.create({
      name,
      email,
      passwordHash,
      role: "superadmin",
      isActive: true,
    });

    console.log("Admin account created successfully!");
    console.log(`Admin email: ${email}`);
  } catch (error) {
    console.error("Admin creation failed:", error);
    process.exitCode = 1;
  } finally {
    const mongoose = (await import("mongoose")).default;

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

createAdmin();
