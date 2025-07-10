import { DocumentType } from '@prisma/client';

export interface DocumentMeta {
  transferId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  assetId: string;
  type: DocumentType;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  fileName?: string | null;
  fileSize?: number | null;
  filePath?: string | null;
  mimeType?: string | null;
  meta?: DocumentMeta | null;
}

export interface DocumentCreateInput {
  assetId: string;
  type: DocumentType;
  url: string;
  fileName?: string | null;
  fileSize?: number | null;
  filePath?: string | null;
  mimeType?: string | null;
  meta?: DocumentMeta | null;
}

export interface DocumentUpdateInput {
  url?: string;
  fileName?: string | null;
  fileSize?: number | null;
  filePath?: string | null;
  mimeType?: string | null;
  meta?: DocumentMeta | null;
  updatedAt?: Date;
}

export interface DocumentWhereInput {
  id?: string;
  assetId?: string;
  type?: DocumentType;
}

export interface DocumentSelect {
  id?: boolean;
  assetId?: boolean;
  type?: boolean;
  url?: boolean;
  createdAt?: boolean;
  updatedAt?: boolean;
  fileName?: boolean;
  fileSize?: boolean;
  filePath?: boolean;
  mimeType?: boolean;
  meta?: boolean;
}

export interface PrismaDocumentClient {
  findFirst: (args: {
    where: DocumentWhereInput;
    select?: DocumentSelect;
  }) => Promise<Document | null>;

  findMany: (args: {
    where: DocumentWhereInput;
    select?: DocumentSelect;
  }) => Promise<Document[]>;

  update: (args: {
    where: { id: string };
    data: DocumentUpdateInput;
  }) => Promise<Document>;

  create: (args: {
    data: DocumentCreateInput;
  }) => Promise<Document>;
}
