import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { UpdateProfileInput } from "./index";

export class UserService {
  static async getCurrentUser() {
    const { userId } = await auth();
    if (!userId) return null;

    return await db.user.findUnique({
      where: { clerkUserId: userId },
    });
  }

  static async getOrCreateCurrentUser() {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const clerkUser = await currentUser();
    if (!clerkUser) throw new Error("User not found in Clerk");

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) throw new Error("User has no email address");

    const name = clerkUser.firstName 
      ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() 
      : null;

    const user = await db.user.upsert({
      where: { clerkUserId: userId },
      update: {
        email,
        name,
        avatarUrl: clerkUser.imageUrl,
      },
      create: {
        clerkUserId: userId,
        email,
        name,
        avatarUrl: clerkUser.imageUrl,
      },
    });

    return user;
  }

  static async updateProfile(data: UpdateProfileInput) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    return await db.user.update({
      where: { id: user.id },
      data,
    });
  }
}
