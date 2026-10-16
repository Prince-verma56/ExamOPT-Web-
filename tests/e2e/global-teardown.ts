import { deleteUsers } from "./clerk-users";

export default async function globalTeardown() {
  await deleteUsers();
}
