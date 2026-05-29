import { LoginButton } from "@/components/auth/login-button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto flex w-full flex-col items-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Leggo</h1>
          <p className="text-sm text-muted-foreground">
            Plan your trips, one stop at a time
          </p>
        </div>
        <LoginButton />
      </div>
    </div>
  );
}
