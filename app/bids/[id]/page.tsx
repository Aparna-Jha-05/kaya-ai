import { BidReview } from "@/components/live/LiveBidViews";

export default function BidDetailPage({ params }: { params: { id: string } }) { return <BidReview bidId={params.id} />; }
