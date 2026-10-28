import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

/**
 * Secure one-time CLI command to provision or promote an Administrator account.
 * Usage:
 *   node scripts/provisionAdmin.js <email> <name> <password>
 * Example:
 *   node scripts/provisionAdmin.js admin@readyup.edu "System Admin" "SecurePassword123!"
 */

const provisionAdmin = async () => {
    const args = process.argv.slice(2);
    const email = args[0] || process.env.INITIAL_ADMIN_EMAIL || "admin@readyup.edu";
    const name = args[1] || process.env.INITIAL_ADMIN_NAME || "System Administrator";
    const password = args[2] || process.env.INITIAL_ADMIN_PASSWORD || "Password123!";

    if (!email || !password || password.length < 8) {
        console.error("Error: Email and a password with at least 8 characters are required.");
        process.exit(1);
    }

    try {
        await connectDB();

        const normalizedEmail = email.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail }).select("+password");

        const hashedPassword = await bcrypt.hash(password, 12);

        if (user) {
            console.log(`User ${normalizedEmail} found. Updating role to 'admin'...`);
            user.role = "admin";
            user.isActive = true;
            user.password = hashedPassword;
            await user.save();
            console.log(`Successfully elevated ${normalizedEmail} to administrator.`);
        } else {
            console.log(`Creating new administrator account for ${normalizedEmail}...`);
            user = await User.create({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role: "admin",
                department: "Central Administration",
                college: "Engineering College",
                isActive: true,
            });
            console.log(`Successfully provisioned new administrator: ${user.name} (${user.email})`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Provisioning failed:", error.message);
        process.exit(1);
    }
};

provisionAdmin();
