import AdminPanel from "@/components/AdminPanel";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminPage({ params }: Props) {
  const { slug } = await params;
  return <AdminPanel slug={slug} />;
}
