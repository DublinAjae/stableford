import GroupPanel from "@/components/GroupPanel";

type Props = { params: Promise<{ slug: string; group: string }> };

export default async function GroupPage({ params }: Props) {
  const { slug, group } = await params;
  return <GroupPanel slug={slug} group={group} />;
}
