// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';

// // GET /api/maintenance-templates/[id] - Get specific maintenance template
// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { id } = await params;

//     const template = await prisma.maintenanceTemplate.findUnique({
//       where: { id },
//       include: {
//         createdBy: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         schedules: {
//           include: {
//             asset: {
//               select: {
//                 id: true,
//                 name: true,
//                 serialNumber: true,
//               },
//             },
//           },
//           where: {
//             status: 'ACTIVE',
//           },
//         },
//         _count: {
//           select: {
//             schedules: true,
//             maintenanceTasks: true,
//           },
//         },
//       },
//     });

//     if (!template) {
//       return NextResponse.json({ error: 'Template not found' }, { status: 404 });
//     }

//     // Parse JSON strings back to arrays for frontend with safe parsing
//     const safeParseJSON = (jsonString: string | null): any[] => {
//       if (!jsonString) return [];
//       try {
//         const parsed = JSON.parse(jsonString);
//         return Array.isArray(parsed) ? parsed : [];
//       } catch (error) {
//         console.error('Error parsing JSON:', error, 'String:', jsonString);
//         return [];
//       }
//     };

//     const templateWithParsedArrays = {
//       ...template,
//       checklistItems: safeParseJSON(template.checklistItems),
//       toolsRequired: safeParseJSON(template.toolsRequired),
//       partsRequired: safeParseJSON(template.partsRequired),
//       maintenanceSchedules: template.schedules, // Rename for frontend compatibility
//     };

//     return NextResponse.json(templateWithParsedArrays);
//   } catch (error) {
//     console.error('Error fetching maintenance template:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch maintenance template' },
//       { status: 500 }
//     );
//   }
// }

// // PUT /api/maintenance-templates/[id] - Update maintenance template
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Only managers can update templates
//     if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
//       return NextResponse.json({ error: 'Access denied' }, { status: 403 });
//     }

//     const { id } = await params;
//     const data = await request.json();

//     const existingTemplate = await prisma.maintenanceTemplate.findUnique({
//       where: { id },
//     });

//     if (!existingTemplate) {
//       return NextResponse.json({ error: 'Template not found' }, { status: 404 });
//     }

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

//     // Check if new name conflicts with existing template (if name is being changed)
//     if (name && name !== existingTemplate.name) {
//       const nameConflict = await prisma.maintenanceTemplate.findFirst({
//         where: {
//           name: {
//             equals: name,
//             mode: 'insensitive',
//           },
//           id: {
//             not: id,
//           },
//         },
//       });

//       if (nameConflict) {
//         return NextResponse.json(
//           { error: 'Template with this name already exists' },
//           { status: 400 }
//         );
//       }
//     }

//     const updatedTemplate = await prisma.maintenanceTemplate.update({
//       where: { id },
//       data: {
//         ...(name && { name }),
//         ...(description !== undefined && { description }),
//         ...(maintenanceType && { maintenanceType }),
//         ...(priority && { priority }),
//         ...(estimatedHours !== undefined && { estimatedHours }),
//         ...(instructions !== undefined && { instructions }),
//         ...(checklistItems !== undefined && {
//           checklistItems: checklistItems ? JSON.stringify(checklistItems) : null
//         }),
//         ...(requiredSkills !== undefined && { requiredSkills }),
//         ...(safetyNotes !== undefined && { safetyNotes }),
//         ...(toolsRequired !== undefined && {
//           toolsRequired: toolsRequired ? JSON.stringify(toolsRequired) : null
//         }),
//         ...(partsRequired !== undefined && {
//           partsRequired: partsRequired ? JSON.stringify(partsRequired) : null
//         }),
//         ...(isActive !== undefined && { isActive }),
//       },
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
//     });

//     return NextResponse.json(updatedTemplate);
//   } catch (error) {
//     console.error('Error updating maintenance template:', error);
//     return NextResponse.json(
//       { error: 'Failed to update maintenance template' },
//       { status: 500 }
//     );
//   }
// }

// // DELETE /api/maintenance-templates/[id] - Delete maintenance template
// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user?.id) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     // Only managers can delete templates
//     if (session.user.role !== 'MANAGER' && session.user.role !== 'ADMIN') {
//       return NextResponse.json({ error: 'Access denied' }, { status: 403 });
//     }

//     const { id } = await params;

//     const existingTemplate = await prisma.maintenanceTemplate.findUnique({
//       where: { id },
//       include: {
//         schedules: {
//           where: {
//             status: 'ACTIVE',
//           },
//         },
//         maintenanceTasks: {
//           where: {
//             status: {
//               in: ['SCHEDULED', 'IN_PROGRESS'],
//             },
//           },
//         },
//       },
//     });

//     if (!existingTemplate) {
//       return NextResponse.json({ error: 'Template not found' }, { status: 404 });
//     }

//     // Check if template is being used by active schedules or tasks
//     if (existingTemplate.schedules.length > 0 || existingTemplate.maintenanceTasks.length > 0) {
//       return NextResponse.json(
//         { error: 'Cannot delete template that is being used by active schedules or tasks' },
//         { status: 400 }
//       );
//     }

//     await prisma.maintenanceTemplate.delete({
//       where: { id },
//     });

//     return NextResponse.json({ message: 'Template deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting maintenance template:', error);
//     return NextResponse.json(
//       { error: 'Failed to delete maintenance template' },
//       { status: 500 }
//     );
//   }
// }
