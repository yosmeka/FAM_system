declare module 'next/server' {
  export class NextResponse {
    static redirect(url: string | URL, init?: ResponseInit): NextResponse;
    static json(body: any, init?: ResponseInit): NextResponse;
    static next(init?: ResponseInit): NextResponse;
    static rewrite(url: string | URL, init?: ResponseInit): NextResponse;
  }

  export interface NextRequest extends Request {
    nextUrl: URL;
    url: string;
  }
} 