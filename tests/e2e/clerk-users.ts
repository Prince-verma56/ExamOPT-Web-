import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Temporary Clerk accounts for the browser tests: one administrator and one
 * student linked to a synthetic roll number. They are created before the run
 * and deleted after it. Only a development instance (sk_test_) is accepted.
 * Clerk development instances accept the code 424242 for +clerk_test emails,
 * so the new-device email step can be completed without a mailbox.
 */

export const E2E_DIR = path.resolve(__dirname, ".auth");
export const USERS_FILE = path.join(E2E_DIR, "users.json");
export const TEST_CODE = "424242";
export const ADMIN_STATE = path.join(E2E_DIR, "admin.json");
export const STUDENT_STATE = path.join(E2E_DIR, "student.json");

export interface E2EUser { id: string; email: string; password: string }
export interface E2EUsers { admin: E2EUser; student: E2EUser }

function secretKey() {
  const envFile = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const key = process.env.CLERK_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_")) throw new Error("Browser tests need a development Clerk instance (CLERK_SECRET_KEY must start with sk_test_).");
  return key;
}

async function clerk(pathname: string, init: RequestInit = {}) {
  return fetch(`https://api.clerk.com/v1${pathname}`, { ...init, headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json", ...init.headers } });
}

async function create(email: string, publicMetadata: Record<string, unknown>): Promise<E2EUser> {
  for (const old of await (await clerk(`/users?email_address=${encodeURIComponent(email)}`)).json()) await clerk(`/users/${old.id}`, { method: "DELETE" });
  const password = `E2e-${crypto.randomBytes(18).toString("base64url")}-7`;
  const res = await clerk("/users", { method: "POST", body: JSON.stringify({ email_address: [email], password, public_metadata: publicMetadata, skip_password_checks: true }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`Could not create ${email}: ${JSON.stringify(body.errors?.map((e: { code: string }) => e.code))}`);
  return { id: body.id, email, password };
}

export async function createUsers(): Promise<E2EUsers> {
  const users = {
    admin: await create("examopt-e2e-admin+clerk_test@example.com", { role: "admin" }),
    student: await create("examopt-e2e-student+clerk_test@example.com", { rollNo: "GLA26-BCA-0001" }),
  };
  fs.mkdirSync(E2E_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users));
  return users;
}

export async function deleteUsers() {
  if (!fs.existsSync(USERS_FILE)) return;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
  for (const u of [users.admin, users.student]) await clerk(`/users/${u.id}`, { method: "DELETE" });
  fs.rmSync(E2E_DIR, { recursive: true, force: true });
}

export function readUsers(): E2EUsers {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
}
