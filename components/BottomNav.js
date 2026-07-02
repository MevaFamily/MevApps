"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, List, Wallet, PieChart, LayoutGrid } from "lucide-react";
import { useState } from "react";
import TransactionForm from "./TransactionForm";

export default function BottomNav() {
  const pathname = usePathname();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const tabs = [
    { name: "Transaksi", path: "/transaksi", icon: List },
    { name: "Anggaran", path: "/anggaran", icon: PieChart },
    { name: "Akun", path: "/akun", icon: Wallet },
    { name: "Hub", path: "/hub", icon: LayoutGrid },
  ];

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-neutral-950 text-white p-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-neutral-100 pb-safe z-30">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.path);
            const Icon = tab.icon;
            return (
              <Link key={tab.path} href={tab.path} className="flex-1 flex flex-col items-center justify-center h-full">
                <Icon size={22} className={isActive ? "text-neutral-900" : "text-neutral-400"} />
                <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-neutral-900" : "text-neutral-400"}`}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Modal */}
      {isFormOpen && <TransactionForm onClose={() => setIsFormOpen(false)} />}
    </>
  );
}
