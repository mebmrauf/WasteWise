import { PickupOffersView } from "./PickupOffersView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PickupOffersView pickupId={id} />;
}
