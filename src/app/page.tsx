"use client";

import { useEffect } from "react";

export default function WelcomePage() {
  useEffect(() => {
    // Doğrudan dashboard'a yönlendir
    window.location.href = "/dashboard";
  }, []);

  // Yönlendirme yapılırken boş sayfa göster
  return null;
}
