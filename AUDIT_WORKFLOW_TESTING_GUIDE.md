# 🧪 Audit Workflow System - Complete Testing Guide

## **Prerequisites**
- ✅ Development server running (`npm run dev`)
- ✅ Database migrated with new audit workflow tables
- ✅ At least 3 users with different roles (ADMIN, MANAGER, USER)
- ✅ Some assets in the system to audit

## **Phase 1: Database Verification**

### **1.1 Check New Tables in Prisma Studio**
1. Open Prisma Studio: `npx prisma studio` (http://localhost:5555)
2. Verify these new tables exist:
   - ✅ `AuditAssignment`
   - ✅ `AuditRequest` 
   - ✅ `AssetAudit` (updated with new fields)

### **1.2 Check Updated AssetAudit Model**
In Prisma Studio, check `AssetAudit` table has new fields:
- ✅ `auditorId` (String?)
- ✅ `workflowStatus` (AuditWorkflowStatus)
- ✅ `assignmentId` (String?)
- ✅ `requestId` (String?)
- ✅ `reviewedBy` (String?)
- ✅ `reviewedAt` (DateTime?)
- ✅ `reviewNotes` (String?)
- ✅ `managerApproval` (Boolean?)

## **Phase 2: API Endpoint Testing**

### **2.1 Test Audit Assignments API**

#### **GET /api/audit-assignments**
```bash
# Test as different roles
curl -X GET "http://localhost:3000/api/audit-assignments" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

#### **POST /api/audit-assignments (Manager/Admin only)**
```bash
curl -X POST "http://localhost:3000/api/audit-assignments" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_MANAGER_SESSION_TOKEN" \
  -d '{
    "assetId": "ASSET_ID_HERE",
    "assignedToId": "USER_ID_HERE",
    "title": "Monthly Asset Audit",
    "description": "Routine monthly audit for compliance",
    "priority": "MEDIUM",
    "dueDate": "2024-06-01T00:00:00Z",
    "instructions": "Check physical condition and location"
  }'
```

### **2.2 Test Audit Requests API**

#### **POST /api/audit-requests (Any role)**
```bash
curl -X POST "http://localhost:3000/api/audit-requests" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_USER_SESSION_TOKEN" \
  -d '{
    "assetId": "ASSET_ID_HERE",
    "title": "Suspected Damage Audit",
    "reason": "Asset appears damaged, needs inspection",
    "urgency": "HIGH",
    "requestedDate": "2024-05-25T00:00:00Z",
    "description": "Found scratches on the equipment"
  }'
```

## **Phase 3: Frontend Testing**

### **3.1 Navigation Testing**
1. **Login as different roles** and verify navigation:
   - ✅ USER: Should see "Audits" in navigation
   - ✅ MANAGER: Should see "Audits" in navigation  
   - ✅ ADMIN: Should see "Audits" in navigation

2. **Click "Audits" link** → Should navigate to `/audits/workflow`

### **3.2 Audit Workflow Page Testing**

#### **As USER Role:**
1. **View Assignments Tab:**
   - ✅ Should only see assignments assigned to them
   - ✅ Should see "No audit assignments found" if none exist
   - ✅ Can search and filter assignments

2. **View Requests Tab:**
   - ✅ Should only see requests they created
   - ✅ Should see "No audit requests found" if none exist
   - ✅ Can search and filter requests

#### **As MANAGER Role:**
1. **View Assignments Tab:**
   - ✅ Should see assignments they created
   - ✅ Should see "New Assignment" button
   - ✅ Can search and filter assignments

2. **View Requests Tab:**
   - ✅ Should see requests assigned to them for review
   - ✅ Should see unassigned requests they can claim
   - ✅ Can search and filter requests

#### **As ADMIN Role:**
1. **View Both Tabs:**
   - ✅ Should see all assignments and requests system-wide
   - ✅ Should see "New Assignment" button
   - ✅ Can search and filter all data

## **Phase 4: Workflow Testing Scenarios**

### **Scenario 1: Manager-Initiated Audit Assignment**

#### **Step 1: Manager Creates Assignment**
1. Login as **MANAGER**
2. Go to `/audits/workflow`
3. Click "Assignments" tab
4. Click "New Assignment" button (TODO: implement modal)
5. Fill assignment details and submit

#### **Step 2: User Accepts Assignment**
1. Login as **USER** (assigned auditor)
2. Go to `/audits/workflow`
3. See the assignment in "Assignments" tab
4. Click assignment to view details (TODO: implement detail page)
5. Accept the assignment

#### **Step 3: User Performs Audit**
1. User starts the audit
2. User completes audit and submits for review
3. Manager reviews and approves/rejects

### **Scenario 2: User-Initiated Audit Request**

#### **Step 1: User Creates Request**
1. Login as **USER**
2. Go to `/audits/workflow`
3. Click "Requests" tab
4. Click "New Request" button (TODO: implement modal)
5. Fill request details and submit

#### **Step 2: Manager Reviews Request**
1. Login as **MANAGER**
2. Go to `/audits/workflow`
3. See the request in "Requests" tab
4. Click request to view details (TODO: implement detail page)
5. Approve or reject the request

#### **Step 3: User Performs Audit (if approved)**
1. User performs audit from approved request
2. Manager reviews final audit results

## **Phase 5: Integration Testing**

### **5.1 Test with Existing Audit Reports**
1. Create some audit assignments and requests
2. Complete a few audits through the workflow
3. Go to `/reports/audits`
4. Verify the new audits appear in reports
5. Check that workflow status is reflected in analytics

### **5.2 Test Role-Based Access Control**
1. **Try accessing APIs with wrong roles:**
   - USER trying to create assignments (should fail)
   - USER trying to approve requests (should fail)
   - MANAGER trying to access other manager's assignments (should fail)

2. **Test UI role restrictions:**
   - USER should not see "New Assignment" button
   - Different roles should see different data sets

## **Phase 6: Error Handling Testing**

### **6.1 API Error Testing**
```bash
# Test invalid asset ID
curl -X POST "http://localhost:3000/api/audit-assignments" \
  -H "Content-Type: application/json" \
  -d '{"assetId": "invalid-id", "assignedToId": "user-id", "title": "Test"}'

# Test missing required fields
curl -X POST "http://localhost:3000/api/audit-assignments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'

# Test unauthorized access
curl -X POST "http://localhost:3000/api/audit-assignments" \
  -H "Content-Type: application/json"
  # (without authentication)
```

### **6.2 Frontend Error Testing**
1. **Test with no data:**
   - Empty assignments list
   - Empty requests list
   - Loading states

2. **Test network errors:**
   - Disconnect internet and try to load page
   - Verify error messages display properly

## **Phase 7: Performance Testing**

### **7.1 Load Testing**
1. Create multiple assignments and requests
2. Test page load times with large datasets
3. Test search and filter performance

### **7.2 Database Performance**
1. Check query performance in terminal logs
2. Verify proper indexing on new tables
3. Test with realistic data volumes

## **Quick Test Checklist**

### **✅ Basic Functionality**
- [ ] Can access `/audits/workflow` page
- [ ] Can switch between Assignments and Requests tabs
- [ ] Can see role-appropriate data
- [ ] Search and filters work
- [ ] APIs return proper responses

### **✅ Role-Based Access**
- [ ] USER sees only their assignments/requests
- [ ] MANAGER sees their scope of data
- [ ] ADMIN sees all data
- [ ] Proper buttons shown for each role

### **✅ Database Integration**
- [ ] New tables exist in Prisma Studio
- [ ] Data is properly stored and retrieved
- [ ] Relations work correctly

### **✅ Error Handling**
- [ ] Proper error messages for invalid requests
- [ ] Loading states work
- [ ] Network error handling

## **Next Steps After Testing**

Once basic testing is complete, we can implement:
1. **Assignment/Request Detail Pages**
2. **Create Assignment/Request Modals**
3. **Audit Performance Interface**
4. **Manager Review Interface**
5. **Automated Notifications**

---

**Need Help?** If you encounter any issues during testing, check:
1. Browser console for JavaScript errors
2. Terminal logs for API errors
3. Prisma Studio for database issues
4. Network tab for failed requests
