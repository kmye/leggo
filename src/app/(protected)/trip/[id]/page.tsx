import { TripWorkspace } from "@/components/trip/trip-workspace";

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TripWorkspace tripId={id} />;
}
