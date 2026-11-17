import { notFound } from "next/navigation";
import { PositionDetail } from "@/components/vault/PositionDetail";

/**
 * One Conviction Position by CVP tokenId. Next.js 16 route params are a
 * Promise; the server component awaits and validates before handing the
 * bigint to the client detail view.
 */
export default async function PositionPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params;
  if (!/^\d+$/.test(tokenId)) notFound();
  return <PositionDetail tokenId={BigInt(tokenId)} />;
}
