import BidDetailClient from "@/components/bid/BidDetailClient";

export default async function BidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BidDetailClient id={id} />;
}
