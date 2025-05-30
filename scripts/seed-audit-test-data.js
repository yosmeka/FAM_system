const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedAuditTestData() {
  try {
    console.log('🌱 Seeding audit workflow test data...');

    // Get existing users and assets
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });

    const assets = await prisma.asset.findMany({
      select: { id: true, name: true, serialNumber: true, department: true }
    });

    if (users.length < 2) {
      console.log('❌ Need at least 2 users (1 MANAGER, 1 USER) to seed audit data');
      return;
    }

    if (assets.length < 1) {
      console.log('❌ Need at least 1 asset to seed audit data');
      return;
    }

    const managers = users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN');
    const regularUsers = users.filter(u => u.role === 'USER');

    if (managers.length === 0 || regularUsers.length === 0) {
      console.log('❌ Need at least 1 MANAGER and 1 USER to seed audit data');
      console.log('Available users:', users.map(u => `${u.name} (${u.role})`));
      return;
    }

    const manager = managers[0];
    const user = regularUsers[0];
    const asset = assets[0];

    console.log(`👤 Using Manager: ${manager.name} (${manager.email})`);
    console.log(`👤 Using User: ${user.name} (${user.email})`);
    console.log(`📦 Using Asset: ${asset.name} (${asset.serialNumber})`);

    // Create test audit assignment
    console.log('📋 Creating test audit assignment...');
    const assignment = await prisma.auditAssignment.create({
      data: {
        assetId: asset.id,
        assignedToId: user.id,
        assignedById: manager.id,
        title: 'Monthly Compliance Audit',
        description: 'Routine monthly audit for regulatory compliance',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        instructions: 'Please verify asset location, condition, and documentation. Take photos if any issues found.',
        estimatedHours: 2.0,
        status: 'PENDING'
      }
    });

    console.log(`✅ Created audit assignment: ${assignment.id}`);

    // Create test audit request
    console.log('📝 Creating test audit request...');
    const request = await prisma.auditRequest.create({
      data: {
        assetId: asset.id,
        requesterId: user.id,
        managerId: manager.id,
        title: 'Suspected Damage Inspection',
        reason: 'Asset appears to have physical damage that needs professional assessment',
        urgency: 'HIGH',
        requestedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        description: 'Found scratches and dents on the equipment during routine use. Requesting immediate audit to assess damage and determine if repair is needed.',
        expectedFindings: 'Physical damage assessment, repair cost estimation',
        status: 'PENDING_APPROVAL'
      }
    });

    console.log(`✅ Created audit request: ${request.id}`);

    // Create a sample completed audit for testing reports
    console.log('🔍 Creating sample completed audit...');
    const completedAudit = await prisma.assetAudit.create({
      data: {
        assetId: asset.id,
        auditDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        auditedBy: user.name || user.email,
        auditorId: user.id,
        status: 'COMPLETED',
        workflowStatus: 'APPROVED',
        condition: 'GOOD',
        locationVerified: true,
        notes: 'Asset is in good condition. Location verified. No issues found.',
        nextAuditDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        reviewedBy: manager.name || manager.email,
        reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        reviewNotes: 'Audit completed satisfactorily. No follow-up required.',
        managerApproval: true
      }
    });

    console.log(`✅ Created completed audit: ${completedAudit.id}`);

    // Create an overdue assignment for testing
    if (assets.length > 1) {
      console.log('⏰ Creating overdue audit assignment...');
      const overdueAssignment = await prisma.auditAssignment.create({
        data: {
          assetId: assets[1].id,
          assignedToId: user.id,
          assignedById: manager.id,
          title: 'Overdue Safety Inspection',
          description: 'Critical safety inspection that is now overdue',
          priority: 'CRITICAL',
          dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (overdue)
          scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          instructions: 'URGENT: This safety inspection is overdue. Please complete immediately.',
          estimatedHours: 1.5,
          status: 'OVERDUE'
        }
      });

      console.log(`✅ Created overdue assignment: ${overdueAssignment.id}`);
    }

    // Create an audit with discrepancies for testing
    console.log('⚠️ Creating audit with discrepancies...');
    const auditWithIssues = await prisma.assetAudit.create({
      data: {
        assetId: asset.id,
        auditDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        auditedBy: user.name || user.email,
        auditorId: user.id,
        status: 'COMPLETED',
        workflowStatus: 'PENDING_REVIEW',
        condition: 'FAIR',
        locationVerified: false,
        notes: 'Asset found in different location than recorded. Minor wear visible.',
        discrepancies: 'Asset location does not match records. Found in Storage Room B instead of Office 101.',
        discrepancyResolved: false,
        nextAuditDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      }
    });

    console.log(`✅ Created audit with discrepancies: ${auditWithIssues.id}`);

    console.log('\n🎉 Audit workflow test data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`- 1 Pending audit assignment`);
    console.log(`- 1 Pending audit request`);
    console.log(`- 1 Completed audit (approved)`);
    console.log(`- 1 Overdue assignment${assets.length > 1 ? '' : ' (skipped - need more assets)'}`);
    console.log(`- 1 Audit with unresolved discrepancies`);

    console.log('\n🧪 Ready for testing!');
    console.log('1. Go to http://localhost:3000/audits/workflow');
    console.log('2. Login as different roles to see different views');
    console.log('3. Check http://localhost:3000/reports/audits for analytics');
    console.log('4. Use Prisma Studio (http://localhost:5555) to view database');

  } catch (error) {
    console.error('❌ Error seeding audit test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedAuditTestData();
