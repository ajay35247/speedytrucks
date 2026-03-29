declare module '@prisma/client' {
  export class PrismaClient {
    [key: string]: any;
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction(...args: any[]): Promise<any>;
    $queryRaw(...args: any[]): Promise<any>;
  }

  export const Prisma: any;
}
