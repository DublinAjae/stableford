import PublicBoard from "@/components/PublicBoard";

type Props = { params: Promise<{ slug: string }> };

export default async function RoundPublicPage({ params }: Props) {
  const { slug } = await params;
  return <PublicBoard slug={slug} />;
}
