import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import { GetStaticProps } from 'next'
import { InferGetStaticPropsType } from 'next'
import * as fs from 'fs/promises'

export default function About({ markdown }: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <div className="center">
      <p>
        <Link href="/">
          <a>← Return to Orbit</a>
        </Link>
      </p>
      <div className="text">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  )
}

export const getStaticProps: GetStaticProps = async (context) => {
  const markdown = await fs.readFile(process.cwd() + '/README.md', 'utf8')
  return { props: { markdown } }
}
