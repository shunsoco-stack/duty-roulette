import { Spin } from "@/components/spin";
export default async function Page({ params }: { params: Promise<{ dutyId: string }> }) {
  const { dutyId } = await params;
  return <Spin dutyId={dutyId} />;
}
