import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
  phone: {
    type: String,
    required: false,
    trim: true,
  },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneOTP: {
      type: String,
    },
    phoneOTPExpiry: {
      type: Date,
    },
    dateOfBirth: {
      type: Date,
    },
    attempt: {
      type: String,
      enum: ['May 26', 'Sept 26', 'Jan 26'],
      trim: true,
    },
    level: {
      type: String,
      enum: ['CA Inter', 'CA Final'],
      trim: true,
    },
    preparingFor: {
      type: String,
      enum: ['Group 1', 'Group 2', 'Both Groups'],
      trim: true,
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
      postalCode: {
        type: String,
        trim: true,
      },
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'subadmin', 'teacher'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailOTP: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    resetPasswordOTP: {
      type: String,
    },
    resetPasswordOTPExpiry: {
      type: Date,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    // Teacher-specific fields (only for role === 'teacher')
    teacherProfile: {
      rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
      },
      totalCopiesRequested: {
        type: Number,
        default: 0,
      },
      totalCopiesApproved: {
        type: Number,
        default: 0,
      },
      totalCopiesEvaluated: {
        type: Number,
        default: 0,
      },
      averageEvaluationTime: {
        type: Number, // in hours
        default: 0,
      },
      feedback: {
        type: String,
        trim: true,
      },
      feedbackUpdatedAt: {
        type: Date,
        default: null,
      },
      warnings: [
        {
          type: {
            type: String,
            enum: ['performance', 'conduct', 'quality', 'compliance', 'other'],
            required: true,
          },
          message: {
            type: String,
            required: true,
            trim: true,
          },
          issuedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;

