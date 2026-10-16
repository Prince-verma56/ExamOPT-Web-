export function studentEmailMatchesAccount(accountEmail: string, rosterEmail: string): boolean {
  const account = accountEmail.trim().toLowerCase();
  const roster = rosterEmail.trim().toLowerCase();
  return account.length > 0 && roster.length > 0 && account === roster;
}
