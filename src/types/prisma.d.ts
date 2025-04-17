declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: { log?: string[] });
    user: any;
    asset: any;
    transfer: any;
    maintenance: any;
    disposal: any;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
} 