import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { normalizeIdentifier } from "./access";

export interface StudentAccountLink {
  key: string; // normalized email or clerk user id
  rollNo: string;
  linkedAt: string;
  linkedBy: string;
  note?: string;
}

const STORAGE_PATH = path.join(process.cwd(), "server", "scheduling", ".student-links.json");
let memoryCache: Map<string, StudentAccountLink> | null = null;

async function loadLinks(): Promise<Map<string, StudentAccountLink>> {
  if (memoryCache) return memoryCache;
  const map = new Map<string, StudentAccountLink>();
  try {
    const raw = await fs.readFile(STORAGE_PATH, "utf-8");
    const list: StudentAccountLink[] = JSON.parse(raw);
    for (const item of list) {
      if (item && item.key && item.rollNo) {
        map.set(item.key.toLowerCase(), item);
      }
    }
  } catch {
    // File doesn't exist yet, start with empty map
  }
  memoryCache = map;
  return map;
}

async function persistLinks(map: Map<string, StudentAccountLink>): Promise<void> {
  memoryCache = map;
  try {
    const list = Array.from(map.values());
    await fs.mkdir(path.dirname(STORAGE_PATH), { recursive: true });
    await fs.writeFile(STORAGE_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (error) {
    console.error("[student-links] Could not persist student links to disk:", error);
  }
}

/**
 * Resolves which synthetic student roll number is linked to a given Clerk user.
 * Priority:
 * 1. Clerk publicMetadata.rollNo (tamper-proof, set by admin)
 * 2. Persistent server-side student link registry (by email or userId)
 * 3. Environment configuration mapping (EXAMOPT_STUDENT_EMAIL_MAPPINGS)
 * 4. Development-only fallback if EXAMOPT_DEMO_STUDENT_ROLL_NO is configured
 */
export async function resolveStudentRollNo(params: {
  userId: string | null;
  email?: string | null;
  metadataRollNo?: string | null;
}): Promise<string | null> {
  const { userId, email, metadataRollNo } = params;

  // 1. Clerk publicMetadata takes highest precedence
  if (metadataRollNo) {
    const normalized = normalizeIdentifier(metadataRollNo);
    if (normalized) return normalized;
  }

  // 2. Persistent registry check by userId or normalized email
  const links = await loadLinks();
  if (email) {
    const link = links.get(email.trim().toLowerCase());
    if (link) return link.rollNo;
  }
  if (userId) {
    const link = links.get(userId.trim().toLowerCase());
    if (link) return link.rollNo;
  }

  // 3. Environment mapping: EXAMOPT_STUDENT_EMAIL_MAPPINGS="email1:ROLL1,email2:ROLL2"
  const envMappings = process.env.EXAMOPT_STUDENT_EMAIL_MAPPINGS;
  if (envMappings && email) {
    const pairs = envMappings.split(",").map((s) => s.trim().toLowerCase());
    const targetEmail = email.trim().toLowerCase();
    for (const pair of pairs) {
      const [pairEmail, pairRoll] = pair.split(":").map((p) => p.trim());
      if (pairEmail === targetEmail && pairRoll) {
        return normalizeIdentifier(pairRoll);
      }
    }
  }

  // 4. Opt-in development fallback for local demo testing
  const isDev = process.env.NODE_ENV !== "production" && process.env.FEATURE_DEMO_MODE === "true";
  const demoFallback = process.env.EXAMOPT_DEMO_STUDENT_ROLL_NO;
  if (isDev && demoFallback) {
    return normalizeIdentifier(demoFallback);
  }

  return null;
}

/**
 * Links a Clerk email or user ID to a student roll number.
 * Callable only by authenticated administrators.
 */
export async function linkStudentAccount(params: {
  emailOrUserId: string;
  rollNo: string;
  linkedBy: string;
  note?: string;
}): Promise<StudentAccountLink> {
  const key = params.emailOrUserId.trim().toLowerCase();
  const rollNo = normalizeIdentifier(params.rollNo);
  if (!rollNo) {
    throw new Error(`Invalid roll number format: ${params.rollNo}`);
  }

  const links = await loadLinks();
  const record: StudentAccountLink = {
    key,
    rollNo,
    linkedAt: new Date().toISOString(),
    linkedBy: params.linkedBy,
    note: params.note,
  };
  links.set(key, record);
  await persistLinks(links);

  // If key looks like a Clerk user id, also try to update Clerk user metadata directly
  if (key.startsWith("user_") && process.env.CLERK_SECRET_KEY) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(key, {
        publicMetadata: {
          rollNo,
          role: "student",
        },
      });
    } catch (clerkErr) {
      console.warn(`[student-links] Could not sync metadata to Clerk for ${key}:`, clerkErr);
    }
  }

  return record;
}

/**
 * Removes a student link.
 */
export async function unlinkStudentAccount(emailOrUserId: string): Promise<boolean> {
  const key = emailOrUserId.trim().toLowerCase();
  const links = await loadLinks();
  const existed = links.delete(key);
  if (existed) {
    await persistLinks(links);
  }
  return existed;
}

/**
 * Lists all active student account links.
 */
export async function listStudentLinks(): Promise<StudentAccountLink[]> {
  const links = await loadLinks();
  return Array.from(links.values());
}
