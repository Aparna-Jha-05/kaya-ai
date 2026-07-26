import BidDetailClient from "@/components/bid/BidDetailClient";

export default function BidDetailPage({ params }: { params: { id: string } }) {
  return <BidDetailClient id={params.id} />;
}
