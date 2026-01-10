import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc: any, ret: any) => {
      // Add id field as alias for _id
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;

      // Handle expiresAt - always include it in response
      if (ret.expiresAt === undefined || ret.expiresAt === null) {
        ret.expiresAt = null;
      } else if (typeof ret.expiresAt === 'object' && !(ret.expiresAt instanceof Date)) {
        // It's an object but not a Date - could be empty object {}
        if (Object.keys(ret.expiresAt).length === 0) {
          ret.expiresAt = null;
        }
      } else if (ret.expiresAt instanceof Date) {
        // Valid date - convert to ISO string
        ret.expiresAt = ret.expiresAt.toISOString();
      }

      // Handle timestamp fields - always include as ISO strings
      if (ret.createdAt) {
        if (ret.createdAt instanceof Date) {
          ret.createdAt = ret.createdAt.toISOString();
        } else if (typeof ret.createdAt === 'object' && Object.keys(ret.createdAt).length === 0) {
          delete ret.createdAt;
        }
      }

      if (ret.updatedAt) {
        if (ret.updatedAt instanceof Date) {
          ret.updatedAt = ret.updatedAt.toISOString();
        } else if (typeof ret.updatedAt === 'object' && Object.keys(ret.updatedAt).length === 0) {
          delete ret.updatedAt;
        }
      }

      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;

      // Handle expiresAt - always include it
      if (ret.expiresAt === undefined || ret.expiresAt === null) {
        ret.expiresAt = null;
      } else if (typeof ret.expiresAt === 'object' && !(ret.expiresAt instanceof Date)) {
        if (Object.keys(ret.expiresAt).length === 0) {
          ret.expiresAt = null;
        }
      } else if (ret.expiresAt instanceof Date) {
        ret.expiresAt = ret.expiresAt.toISOString();
      }

      // Handle timestamps
      if (ret.createdAt instanceof Date) {
        ret.createdAt = ret.createdAt.toISOString();
      }
      if (ret.updatedAt instanceof Date) {
        ret.updatedAt = ret.updatedAt.toISOString();
      }

      return ret;
    }
  }
})
export class Coupon extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: String, enum: CouponType, required: true })
  type: CouponType;

  @Prop({ required: true })
  value: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: 0 })
  maxUses: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ default: 0 })
  minPurchaseAmount: number;

  // Timestamp fields (added by timestamps: true in schema)
  createdAt?: Date;
  updatedAt?: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

// Add virtual 'id' property
CouponSchema.virtual('id').get(function (this: any) {
  return this._id?.toHexString();
});

// Pre-save middleware to clean up empty objects for date fields
CouponSchema.pre('save', function (next) {
  const dateFields = ['expiresAt', 'createdAt', 'updatedAt'];

  dateFields.forEach(field => {
    const value = this[field];
    // Remove empty objects, null, or invalid dates
    if (value !== undefined) {
      if (value === null) {
        this[field] = undefined;
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        // Empty object or BSON object
        if (Object.keys(value).length === 0) {
          this[field] = undefined;
        }
      } else if (value instanceof Date && isNaN(value.getTime())) {
        // Invalid date
        this[field] = undefined;
      }
    }
  });

  next();
});

// Pre-update middleware to clean up empty objects during findOneAndUpdate
CouponSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update = this.getUpdate() as any;

  if (!update) {
    return next();
  }

  const dateFields = ['expiresAt', 'createdAt', 'updatedAt'];

  // Handle both direct updates and $set updates
  const targets = [update, update.$set].filter(Boolean);

  targets.forEach(target => {
    dateFields.forEach(field => {
      const value = target[field];
      if (value !== undefined) {
        // Remove empty objects or invalid dates
        if (value === null ||
          (typeof value === 'object' && !(value instanceof Date) && Object.keys(value).length === 0) ||
          (value instanceof Date && isNaN(value.getTime()))) {
          delete target[field];
          // Add to $unset to remove from database
          if (!update.$unset) update.$unset = {};
          update.$unset[field] = '';
        }
      }
    });
  });

  next();
});