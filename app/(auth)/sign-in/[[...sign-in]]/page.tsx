import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to access the ExamOpt Studio workspace
        </p>
        <div className="mt-2 inline-flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg border">
          <span>🎓 Student: <strong>student+clerk_test@example.com</strong></span>
          <span>•</span>
          <span>🔑 Admin: <strong>admin+clerk_test@example.com</strong></span>
          <span>•</span>
          <span>Pass: <strong>Student@123456!</strong> (OTP: <strong>424242</strong>)</span>
        </div>
      </div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/admin"
        appearance={{
          variables: {
            colorPrimary: "#3b5bdb",
          },
        }}
      />
    </div>
  );
}
