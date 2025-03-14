"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const router = useRouter();

    useEffect(() => {
        // Dashboard ana sayfasından overview sayfasına yönlendir
        router.replace("/dashboard/overview");
    }, [router]);

    // Yönlendirme sırasında boş sayfa göster
    return null;
} 