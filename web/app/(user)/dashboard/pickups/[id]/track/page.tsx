import { TrackPickupView } from "./TrackPickupView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TrackPickupView pickupId={id} />;
}
