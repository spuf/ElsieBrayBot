import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { UserModel } from '../lib/store'
import styles from '../styles/Guardian.module.css'
import type { AuthResponse } from './api/auth'

function Character({ character }: UserModel) {
  if (!character) {
    throw new Error()
  }

  return (
    <div className={styles.emblem}>
      <Image className={styles.background} src={character.emblemPath} alt="Emblem" layout="fill" objectFit="contain" />
      <span className={styles.light}>{character.light}</span>
    </div>
  )
}

export default function Guardian({ user }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!user) {
    return <p>Login</p>
  }
  if (!user.bungie) {
    return <p>Login Bungie</p>
  }

  return (
    <div className="center">
      <p>
        <Link href="/">
          <a>← Return to Orbit</a>
        </Link>
      </p>
      <p>
        Telegram:{' '}
        <a href={`https://t.me/${user.telegram_username}`} target="_blank" rel="noreferrer">
          @{user.telegram_username}
        </a>
      </p>
      <p>
        Bungie.net:{' '}
        <a href="https://www.bungie.net/7/ru/User/Profile/254/100002/bungie" target="_blank" rel="noreferrer">
          {user.bungie.uniqueName}
        </a>
      </p>
      <Character character={user.character} />
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<AuthResponse> = async (ctx) => {
  const props = {
    user: {
      telegram_id: '100001',
      telegram_username: 'tgname',
      bungie: {
        membershipId: '100002',
        uniqueName: 'bungie#3006',
      },
      character: {
        characterId: '100003',
        membershipId: '100004',
        membershipType: 100,
        light: 1440,
        emblemPath: 'https://www.bungie.net/common/destiny2_content/icons/30304f81bf77ad95f5176aa706e20a96.jpg',
      },
    },
  }

  return { props }
}
