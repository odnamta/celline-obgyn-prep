import { PublicExam } from '@/components/public-test/PublicExam'

interface Props {
  params: Promise<{ code: string }>
}

export default async function PublicExamPage({ params }: Props) {
  const { code } = await params
  return <PublicExam code={code} />
}
