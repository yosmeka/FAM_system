// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';
// import { withRole } from '@/middleware/rbac';

// // GET /api/maintenance-templates - Get all maintenance templates
// export const GET = withRole(['MANAGER', 'USER'], async function GET(request: NextRequest) {
//   try {

//     const { searchParams } = new URL(request.url);
//     const maintenanceType = searchParams.get('maintenanceType');
//     const isActive = searchParams.get('isActive');

//     const where: any = {};

//     // Filter by maintenance type if specified
//     if (maintenanceType) {
//       where.maintenanceType = maintenanceType;
//     }

//     // Filter by active status if specified
//     if (isActive !== null) {
//       where.isActive = isActive === 'true';
//     }

//     const templates = await prisma.maintenanceTemplate.findMany({
//       where,
//       include: {
//         createdBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         _count: {
//           select: {
//             schedules: true,
//             maintenanceTasks: true,
//           },
//         },
//       },
//       orderBy: {
//         name: 'asc',
//       },
//     });

//     // Parse JSON strings back to arrays for frontend with safe parsing
//     const templatesWithParsedArrays = templates.map(template => {
//       const safeParseJSON = (jsonString: string | null): any[] => {
//         if (!jsonString) return [];
//         try {
//           const parsed = JSON.parse(jsonString);
//           return Array.isArray(parsed) ? parsed : [];
//         } catch (error) {
//           console.error('Error parsing JSON:', error, 'String:', jsonString);
//           return [];
//         }
//       };

//       return {
//         ...template,
//         checklistItems: safeParseJSON(template.checklistItems),
//         toolsRequired: safeParseJSON(template.toolsRequired),
//         partsRequired: safeParseJSON(template.partsRequired),
//       };
//     });

//     return NextResponse.json(templatesWithParsedArrays);
//   } catch (error) {
//     console.error('Error fetching maintenance templates:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch maintenance templates' },
//       { status: 500 }
//     );
//   }
// });

// // POST /api/maintenance-templates - Create new maintenance template
// export const POST = withRole(['MANAGER', 'ADMIN'], async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);

//     const data = await request.json();
//     const {
//       name,
//       description,
//       maintenanceType,
//       priority,
//       estimatedHours,
//       instructions,
//       checklistItems,
//       requiredSkills,
//       safetyNotes,
//       toolsRequired,
//       partsRequired,
//       isActive,
//     } = data;

//     // Validate required fields
//     if (!name) {
//       return NextResponse.json(
//         { error: 'Template name is required' },
//         { status: 400 }
//       );
//     }

//     // Check if template name already exists
//     const existingTemplate = await prisma.maintenanceTemplate.findFirst({
//       where: {
//         name: {
//           equals: name,
//           mode: 'insensitive',
//         },
//       },
//     });

//     if (existingTemplate) {
//       return NextResponse.json(
//         { error: 'Template with this name already exists' },
//         { status: 400 }
//       );
//     }

//     const template = await prisma.maintenanceTemplate.create({
//       data: {
//         name,
//         description,
//         maintenanceType: maintenanceType || 'PREVENTIVE',
//         priority: priority || 'MEDIUM',
//         estimatedHours,
//         instructions,
//         checklistItems: checklistItems ? JSON.stringify(checklistItems) : null,
//         requiredSkills,
//         safetyNotes,
//         toolsRequired: toolsRequired ? JSON.stringify(toolsRequired) : null,
//         partsRequired: partsRequired ? JSON.stringify(partsRequired) : null,
//         isActive: isActive !== false, // Default to true
//         createdById: session.user.id,
//       },
//       include: {
//         createdBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(template, { status: 201 });
//   } catch (error) {
//     console.error('Error creating maintenance template:', error);
//     return NextResponse.json(
//       { error: 'Failed to create maintenance template' },
//       { status: 500 }
//     );
//   }
// });
