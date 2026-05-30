import { acceptInvite } from "@/lib/actions/invites";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await acceptInvite(token);

  if (result?.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Invite Error</h1>
          <p className="text-muted-foreground">{result.error}</p>
          <a href="/dashboard" className="text-primary underline">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return null;
}
