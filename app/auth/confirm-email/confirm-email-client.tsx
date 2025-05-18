// app/auth/confirm-email/confirm-email-client.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ConfirmEmailClient() {
  // Put any client-side logic here if needed
  
  return (
    <Link href="/login" className="w-full">
      <Button variant="outline" className="w-full">
        Back to Login
      </Button>
    </Link>
  );
}