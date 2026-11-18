"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";

type OrderDisclosure = {
  expanded: boolean;
  openOrderForm: () => void;
  toggleOrderForm: () => void;
};

const OrderDisclosureContext = createContext<OrderDisclosure | null>(null);

export function OrderDisclosureProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const openOrderForm = () => setExpanded(true);
  const toggleOrderForm = () => setExpanded((current) => !current);

  return (
    <OrderDisclosureContext.Provider value={{ expanded, openOrderForm, toggleOrderForm }}>
      {children}
    </OrderDisclosureContext.Provider>
  );
}

export function useOrderDisclosure() {
  const context = useContext(OrderDisclosureContext);
  if (!context) throw new Error("useOrderDisclosure must be used within OrderDisclosureProvider.");
  return context;
}

export function OrderStartButton({ children, className }: { children: ReactNode; className: string }) {
  const { expanded, openOrderForm } = useOrderDisclosure();
  return (
    <button aria-controls="order-form-panel" aria-expanded={expanded} className={className} onClick={openOrderForm} type="button">
      {children}
    </button>
  );
}

export function OrderStartLink({ children, className }: { children: ReactNode; className?: string }) {
  const { expanded, openOrderForm } = useOrderDisclosure();
  return (
    <Link aria-controls="order-form-panel" aria-expanded={expanded} className={className} href="#order" onClick={openOrderForm}>
      {children}
    </Link>
  );
}
