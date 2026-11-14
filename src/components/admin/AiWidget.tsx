"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, X } from "lucide-react";
import AiChat from "./AiChat";

export default function AiWidget() {
  const [open, setOpen] = useState(false);
  if (usePathname() === "/admin/ai") return null;
  return (
    <>
      {open && (
        <div className="fixed right-4 bottom-20 z-50 h-[min(640px,calc(100vh-120px))] w-[min(420px,calc(100vw-32px))] shadow-2xl">
          <AiChat compact />
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl hover:scale-105" aria-label="Trợ lý AI">
        {open ? <X /> : <Bot />}
      </button>
    </>
  );
}
