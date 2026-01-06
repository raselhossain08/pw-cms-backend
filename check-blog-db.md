# 🔍 Check & Fix Blog Database Issues

## Problem
Blog posts are not persisting after reload. This usually happens when there are **multiple blog documents** in the database instead of just ONE.

## Why This Happens
The blog system uses a **single container document** that holds all blog posts in an array. If multiple documents exist:
- `GET` requests might fetch a different document than `UPDATE` requests
- Your changes get saved to document A, but the GET request fetches document B
- This makes it seem like posts are not persisting

## Solution: Cleanup Duplicate Documents

### Step 1: Check How Many Blog Documents Exist

**Option A: Using MongoDB Compass or Shell**
```bash
# Connect to your MongoDB
mongosh

# Switch to your database
use your-database-name

# Count blog documents
db.blogs.countDocuments()

# List all blog documents
db.blogs.find({}, { title: 1, createdAt: 1, 'blogs': { $size: '$blogs' } })
```

**Option B: Using the Cleanup Script**

Run the automated cleanup script:

```bash
cd backend

# Make sure you're in the backend directory
npm run build

# Run the cleanup script
npx ts-node src/cms/home/blog/scripts/cleanup-duplicates.ts
```

The script will:
1. ✅ Check how many blog documents exist
2. ✅ Show details of each document
3. ✅ Keep the OLDEST (first) document
4. ✅ Delete all duplicates automatically
5. ✅ Verify the cleanup

### Step 2: Expected Result

After cleanup, you should see:
```
📊 Remaining blog documents: 1
✅ SUCCESS! Database now has exactly ONE blog document.
🎉 Your blog posts should now persist correctly!
```

### Step 3: Verify in Dashboard

1. Restart your backend server (if running)
2. Refresh your dashboard
3. Your blog posts should now appear
4. Create a new post and reload - it should persist!

---

## Alternative: Manual MongoDB Cleanup

If you prefer to clean up manually using MongoDB:

```javascript
// In MongoDB Shell or Compass

// 1. Find all blog documents
db.blogs.find().sort({ createdAt: 1 })

// 2. Get the ID of the FIRST (oldest) document
// Let's say it's: "507f1f77bcf86cd799439011"

// 3. Delete all OTHER documents
db.blogs.deleteMany({
  _id: { $ne: ObjectId("507f1f77bcf86cd799439011") }
})

// 4. Verify only one remains
db.blogs.countDocuments()  // Should return 1
```

---

## Prevention: How to Avoid This in the Future

The backend service has been updated to always use:
```typescript
.findOne().sort({ createdAt: 1 })
```

This ensures:
- ✅ Always works with the SAME (oldest) document
- ✅ Consistent across all operations (GET, UPDATE, DELETE)
- ✅ No more duplicate document creation

---

## Quick Test After Cleanup

1. **Navigate** to `/cms/home/blog` in dashboard
2. **Click** "Add Blog Post"
3. **Fill in** title: "Test Persistence"
4. **Click** "Save Changes"
5. **Reload** the page (F5)
6. **Verify** the "Test Persistence" post is still there ✅

---

## If Issues Persist

If you still have issues after cleanup:

### Check Backend Logs
Look for errors like:
- "Blog not found"
- "Failed to update blog"
- Connection errors

### Check Network Requests
In browser DevTools (F12) > Network tab:
- Check if PATCH request to `/api/cms/home/blog` returns 200 OK
- Verify the response contains your blog posts
- Check if the data structure is correct

### Verify MongoDB Connection
```bash
# In backend/.env
MONGODB_URI=mongodb://localhost:27017/your-database-name

# Make sure MongoDB is running
mongosh --eval "db.stats()"
```

---

## Contact/Debug

If you need more help, provide:
1. Output of cleanup script
2. Number of documents in database: `db.blogs.countDocuments()`
3. Backend logs when saving
4. Browser console errors (if any)

---

**Status**: This issue should be fixed with the cleanup script! 🎉

