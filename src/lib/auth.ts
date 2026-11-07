
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "ADMIN_JWT_SECRET must be configured with at least 32 characters."
  );
}

const secret = new TextEncoder().encode(JWT_SECRET);

export interface AdminSession {
  adminId: string;
  email: string;
  role: "superadmin" | "admin";
}

export async function createSessionToken(admin: AdminSession) {
  return new SignJWT({
    email: admin.email,
    role: admin.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(admin.adminId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifySessionToken(
  token: string
): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "admin" && payload.role !== "superadmin")
    ) {
      return null;
    }

    return {
      adminId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
