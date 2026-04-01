import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import cloudinary from "../config/cloudinary.js";
/* ===========================
   CREATE USER (LOCAL SIGNUP)
=========================== */
export const createUser = async (req, res) => {
  try {
    const {
      email,
      passwordHash,
      firstName,
      lastName,
      username,
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      username,
      authProvider: "local",
    });

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.status(201).json({ user: safeUser });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
};

/* ===========================
   GET ALL USERS (ADMIN / CHAT)
=========================== */
export const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};

    // Support search by name or email
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter = {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { email: regex },
          { username: regex },
        ],
      };
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .limit(20);
    res.json({ users });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

/* ===========================
   GET RANDOM USERS (DISCOVERY)
=========================== */
export const getRandomUsers = async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 7;
    
    // Aggregation pipeline to get random users excluding current user
    const users = await User.aggregate([
      { $match: { _id: { $ne: req.user._id } } },
      { $sample: { size: count } },
      { $project: { passwordHash: 0, authProvider: 0, providerId: 0 } } // Exclude sensitive fields
    ]);
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch random users",
      error: error.message,
    });
  }
};

/* ===========================
   GET CURRENT LOGGED-IN USER
   (USED BY /api/users/me)
=========================== */
export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const safeUser = req.user.toObject();
    delete safeUser.passwordHash;
    
    // Add flag so frontend knows if password is set
    safeUser.hasPassword = !!req.user.passwordHash;

    res.json({ user: safeUser });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user",
      error: error.message,
    });
  }
};

/* ===========================
   GET USER BY ID
=========================== */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(400).json({
      message: "Invalid user ID",
      error: error.message,
    });
  }
};

/* ===========================
   UPDATE USER (SELF / ADMIN)
=========================== */
export const updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };

    // ❌ Never allow password update here
    delete updates.passwordHash;
    delete updates.authProvider;
    delete updates.providerId;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: 'after' }
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update user",
      error: error.message,
    });
  }
};

/* ===========================
   DELETE USER
=========================== */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
};



// controllers/user.controller.js

export const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "username",
      "dob",
      "gender",
      "mobileNumber",
      "profileImage",
      "statusText"
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { returnDocument: 'after' }
    ).select("-passwordHash");

    res.json({
      message: "Profile updated successfully",
      user
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};


// changepass 

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isMatch) {
      return res.status(401).json({ message: "Wrong current password" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===========================
   UPLOAD AVATAR TO CLOUDINARY
=========================== */
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload buffer to Cloudinary (memoryStorage — no req.file.path)
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "nurachat/profiles",
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: uploadResult.secure_url },
      { returnDocument: 'after' }
    ).select("-passwordHash");

    res.json({
      message: "Profile picture updated successfully",
      user,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to upload profile picture", error: err.message });
  }
};
