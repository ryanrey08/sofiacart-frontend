"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import api from "@/lib/api/axios";
import { Button } from "@/components/ui/button";

export function PrivateEvidence({ requestId, index, name, mime }: { requestId: number; index: number; name: string; mime: string }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let url = "";
    api.get<Blob>(`/api/v1/return-requests/${requestId}/evidence/${index}`, { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        url = URL.createObjectURL(new Blob([response.data], {
          type: ["image/jpeg", "image/png", "image/webp"].includes(mime) ? mime : "application/octet-stream",
        }));
        setBlobUrl(url);
        setError(false);
      })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [requestId, index, attempt, mime]);
  return <div className="rounded-xl border p-3">
    {blobUrl ? <>
      {["image/jpeg", "image/png", "image/webp"].includes(mime) && <Image src={blobUrl} alt={`Return evidence: ${name}`} width={320} height={192} unoptimized className="max-h-48 max-w-full object-contain" />}
      <a href={blobUrl} download={name} className="text-brand-700 underline">Download {name}</a>
    </> : error ? <div role="alert">Could not load {name}. <Button variant="outline" onClick={() => { setBlobUrl(""); setAttempt((value) => value + 1); }}>Retry</Button></div> :
      <p role="status">Loading {name}…</p>}
  </div>;
}
