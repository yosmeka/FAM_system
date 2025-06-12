declare module '@prisma/client' {
  export interface User {
    id: string;
    name: string | null;
    email: string;
    password: string;
    role: 'ADMIN' | 'MANAGER' | 'USER' | 'AUDITOR';
    emailVerified: Date | null;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Asset {
    id: string;
    name: string;
    description: string | null;
    serialNumber: string;
    purchaseDate: Date;
    purchasePrice: number;
    currentValue: number;
    status: string;
    location: string | null;
    department: string | null;
    category: string | null;
    type: string | null;
    supplier: string | null;
    warrantyExpiry: Date | null;
    lastMaintenance: Date | null;
    nextMaintenance: Date | null;
    depreciableCost: number | null;
    salvageValue: number | null;
    usefulLifeMonths: number | null;
    depreciationMethod: string | null;
    depreciationStartDate: Date | null;
    lastAuditDate: Date | null;
    nextAuditDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Transfer {
    id: string;
    assetId: string;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
    fromDepartment: string;
    requesterId: string;
    toDepartment: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
    managerReason: string | null;
    managerId: string | null;
  }

  export interface Maintenance {
    id: string;
    assetId: string;
    description: string;
    cost: number | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    scheduledDate: Date | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requesterId: string;
    managerId: string | null;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'WORK_COMPLETED' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';
    notes: string | null;
    maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
    scheduleId: string | null;
    templateId: string | null;
    assignedToId: string | null;
    estimatedHours: number | null;
    actualHours: number | null;
    checklistItems: string | null;
  }

  export interface Disposal {
    id: string;
    assetId: string;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
    actualValue: number | null;
    expectedValue: number;
    requesterId: string;
    method: 'SALE' | 'DONATION' | 'RECYCLE' | 'SCRAP';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  }

  export interface WhereInput {
    [key: string]: unknown;
  }

  export interface CreateInput {
    [key: string]: unknown;
  }

  export interface UpdateInput {
    [key: string]: unknown;
  }

  export interface UpsertInput {
    where: WhereInput;
    create: CreateInput;
    update: UpdateInput;
  }

  export interface FindManyArgs {
    where?: WhereInput;
    include?: Record<string, boolean | object>;
    select?: Record<string, boolean>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    take?: number;
    skip?: number;
  }

  export interface FindUniqueArgs {
    where: WhereInput;
    include?: Record<string, boolean | object>;
    select?: Record<string, boolean>;
  }

  export interface CreateArgs {
    data: CreateInput;
    include?: Record<string, boolean | object>;
    select?: Record<string, boolean>;
  }

  export interface UpdateArgs {
    where: WhereInput;
    data: UpdateInput;
    include?: Record<string, boolean | object>;
    select?: Record<string, boolean>;
  }

  export interface DeleteArgs {
    where: WhereInput;
    include?: Record<string, boolean | object>;
    select?: Record<string, boolean>;
  }

  export interface CountArgs {
    where?: WhereInput;
  }

  export interface PrismaDelegate<T> {
    findMany(args?: FindManyArgs): Promise<T[]>;
    findUnique(args: FindUniqueArgs): Promise<T | null>;
    findFirst(args?: FindManyArgs): Promise<T | null>;
    create(args: CreateArgs): Promise<T>;
    update(args: UpdateArgs): Promise<T>;
    delete(args: DeleteArgs): Promise<T>;
    upsert(args: UpsertInput): Promise<T>;
    count(args?: CountArgs): Promise<number>;
  }

  export class PrismaClient {
    constructor(options?: { log?: string[] });
    user: PrismaDelegate<User>;
    asset: PrismaDelegate<Asset>;
    transfer: PrismaDelegate<Transfer>;
    maintenance: PrismaDelegate<Maintenance>;
    disposal: PrismaDelegate<Disposal>;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
}