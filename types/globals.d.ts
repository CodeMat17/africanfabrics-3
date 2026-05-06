export {};

// Create a type for the Roles
export type Roles = "admin" | "consultant" | "staff";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
    };
  }
}
