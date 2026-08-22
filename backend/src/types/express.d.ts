declare global {
  namespace Express {
    interface Request {
      userId?: string;
      authenticatedUser?: {
        id: string;
        email: string;
      };
    }
  }
}

export {};
