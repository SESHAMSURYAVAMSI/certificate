
"use client";

import { useParams } from "next/navigation";
import CategoryForm from "@/components/admin/category-form";

export default function NewCategoryPage() {
  const params = useParams<{ id: string }>();

  return <CategoryForm eventId={params.id} />;
}
