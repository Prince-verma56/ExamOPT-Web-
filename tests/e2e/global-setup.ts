import { createUsers } from "./clerk-users";

export default async function globalSetup() {
  await createUsers();
}
