"use client";

import { DepositCard } from "@/components/DepositCard";
import { UserLotsList } from "@/components/UserLotsList";
import { Analytics } from "@/components/Analytics";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <Analytics />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <DepositCard />
        <UserLotsList />
      </div>
    </div>
  );
}