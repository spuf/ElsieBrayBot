import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>ElsieBrayBot</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <p className={styles.description}>
          <Image src="/avatar.jpg" alt="ElsieBrayBot" width={122} height={122} className={styles.avatar} />
        </p>

        <h1 className={styles.title}>ElsieBrayBot</h1>

        <p className={styles.description}>
          <a href="https://t.me/ElsieBrayBot" target="_blank" rel="noreferrer">
            https://t.me/ElsieBrayBot
          </a>
        </p>
      </main>
    </div>
  )
}
